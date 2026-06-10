const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

const propertyId = process.env.PROPERTY_ID || '414258625';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://analytics-dashboard-7teo.onrender.com/auth/callback';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const SC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_CONSOLE_SITE_URL = process.env.SEARCH_CONSOLE_SITE_URL;
const ADMIN_PIN = process.env.ADMIN_PIN || '9999';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_GIST_ID = process.env.GITHUB_GIST_ID;

let storedTokens = GOOGLE_REFRESH_TOKEN ? { refresh_token: GOOGLE_REFRESH_TOKEN } : null;
let serviceAccountToken = null;
let scToken = null;
let semrushData = [];

// ── Gist persistence ──────────────────────────────────────────────────────────

async function loadFromGist() {
  if (!GITHUB_TOKEN || !GITHUB_GIST_ID) return;
  try {
    const r = await axios.get(`https://api.github.com/gists/${GITHUB_GIST_ID}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
    });
    const content = r.data.files['keywords.json']?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        semrushData = parsed;
        console.log(`[gist] Cargados ${semrushData.length} keywords desde Gist`);
      }
    }
  } catch (err) {
    console.error('[gist] Error al cargar:', err.message);
  }
}

async function saveToGist(data) {
  if (!GITHUB_TOKEN || !GITHUB_GIST_ID) return;
  await axios.patch(`https://api.github.com/gists/${GITHUB_GIST_ID}`, {
    files: { 'keywords.json': { content: JSON.stringify(data) } }
  }, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  });
}

loadFromGist();

const hasServiceAccount = Boolean(SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY);
const hasRefreshToken = Boolean(GOOGLE_REFRESH_TOKEN && CLIENT_ID && CLIENT_SECRET);

// ── Auth routes ──────────────────────────────────────────────────────────────

app.get('/auth/login', (req, res) => {
  if (hasServiceAccount || hasRefreshToken) {
    return res.send(`
      <html>
        <body style="background:#0f172a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="font-size:48px">✅</h1>
            <h2>Google Analytics ya está conectado</h2>
            <p style="color:#94a3b8">El dashboard usa credenciales configuradas en el servidor.</p>
          </div>
        </body>
      </html>
    `);
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).send('Faltan OAUTH_CLIENT_ID u OAUTH_CLIENT_SECRET en el servidor.');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GA_SCOPE,
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    storedTokens = {
      ...response.data,
      expires_at: Date.now() + response.data.expires_in * 1000
    };
    res.send(`
      <html>
        <body style="background:#0f172a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="font-size:48px">✅</h1>
            <h2>¡Autorización exitosa!</h2>
            <p style="color:#94a3b8">Ya puedes cerrar esta ventana y usar el dashboard.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error obteniendo token: ' + err.message);
  }
});

app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: hasServiceAccount || hasRefreshToken || !!storedTokens,
    mode: hasServiceAccount ? 'service_account' : (hasRefreshToken ? 'refresh_token' : 'oauth')
  });
});

// ── Token helpers ─────────────────────────────────────────────────────────────

const getServiceAccountToken = async () => {
  if (serviceAccountToken?.expires_at && Date.now() < serviceAccountToken.expires_at - 60000) {
    return serviceAccountToken.access_token;
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: SERVICE_ACCOUNT_EMAIL, scope: GA_SCOPE, aud: GOOGLE_TOKEN_URL, exp: now + 3600, iat: now },
    SERVICE_ACCOUNT_PRIVATE_KEY,
    { algorithm: 'RS256' }
  );

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await axios.post(GOOGLE_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  serviceAccountToken = {
    access_token: response.data.access_token,
    expires_at: Date.now() + response.data.expires_in * 1000
  };

  return serviceAccountToken.access_token;
};

const getAccessToken = async () => {
  if (hasServiceAccount) return getServiceAccountToken();

  if (!storedTokens) throw new Error('No autenticado. Visita /auth/login primero.');

  if (!storedTokens.access_token || !storedTokens.expires_at || Date.now() > storedTokens.expires_at - 60000) {
    if (!storedTokens.refresh_token) {
      storedTokens = null;
      throw new Error('La sesión expiró. Visita /auth/login para autorizar de nuevo.');
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: storedTokens.refresh_token,
        grant_type: 'refresh_token'
      });
      console.log('[auth] Token exchange OK, scopes:', response.data.scope);
      storedTokens = { ...storedTokens, ...response.data, expires_at: Date.now() + response.data.expires_in * 1000 };
    } catch (tokenErr) {
      console.error('[auth] Token exchange FAILED:', tokenErr.response?.data || tokenErr.message);
      throw new Error('Token inválido: ' + JSON.stringify(tokenErr.response?.data || tokenErr.message));
    }
  }
  return storedTokens.access_token;
};

// Search Console uses its own scope — separate JWT for service accounts
const getSearchConsoleToken = async () => {
  if (scToken?.expires_at && Date.now() < scToken.expires_at - 60000) {
    return scToken.access_token;
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: SERVICE_ACCOUNT_EMAIL, scope: SC_SCOPE, aud: GOOGLE_TOKEN_URL, exp: now + 3600, iat: now },
    SERVICE_ACCOUNT_PRIVATE_KEY,
    { algorithm: 'RS256' }
  );

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await axios.post(GOOGLE_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  scToken = {
    access_token: response.data.access_token,
    expires_at: Date.now() + response.data.expires_in * 1000
  };

  return scToken.access_token;
};

// For OAuth mode the existing token is reused (requires webmasters scope to have been granted)
const getSearchConsoleAccessToken = async () => {
  if (hasServiceAccount) return getSearchConsoleToken();
  return getAccessToken();
};

// ── Date helpers ──────────────────────────────────────────────────────────────

const getDateRange = (days) => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { startDate, endDate };
};

const toISODate = (date) => date.toISOString().split('T')[0];

const isISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

const resolveDateRange = (query, defaultDays = 30) => {
  if (isISODate(query.startDate) && isISODate(query.endDate)) {
    return { startDate: query.startDate, endDate: query.endDate };
  }
  return getDateRange(parseInt(query.days || defaultDays));
};

const getClosedMonthlyRanges = (months = 6) => {
  const today = new Date();
  const ranges = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(today.getFullYear(), today.getMonth() - i - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - i, 0);

    ranges.push({
      label: start.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
      startDate: toISODate(start),
      endDate: toISODate(end),
      isPartial: false
    });
  }

  return ranges;
};

const getCurrentMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    label: start.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
    startDate: toISODate(start),
    endDate: toISODate(today),
    isPartial: true,
    dayOfMonth: today.getDate()
  };
};

// ── CSV helpers (Semrush) ─────────────────────────────────────────────────────

function findCol(headers, candidates) {
  for (const name of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase());
    if (idx !== -1) return idx;
  }
  // fallback: partial match
  for (const name of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function splitCsvLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; continue; }
    if (line[i] === sep && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += line[i];
  }
  result.push(current.trim());
  return result;
}

function parseSemrushCsv(csv, filename) {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error('CSV vacío');

  // Semrush exports include a metadata block before the real header — skip it
  // Handle BOM (﻿), quoted fields ("Keyword"), and both , and ; separators
  const headerLineIdx = lines.findIndex(l => /^[﻿"']?keyword["']?[,;\t]/i.test(l));
  if (headerLineIdx === -1) {
    console.error('[csv] Primeras 5 líneas:', lines.slice(0, 5).map(l => JSON.stringify(l)));
    throw new Error('No se encontró la fila de encabezados. Primeras líneas: ' + lines.slice(0, 3).map(l => l.substring(0, 60)).join(' | '));
  }

  const sep = lines[headerLineIdx].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[headerLineIdx], sep);

  // Detect date-based position columns: headers ending in _YYYYMMDD (no extra suffix)
  const datePattern = /_(\d{8})$/;
  const positionCols = headers
    .map((h, i) => ({ header: h, idx: i, date: (h.match(datePattern) || [])[1] }))
    .filter(c => c.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const currentCol  = positionCols.length > 0 ? positionCols[positionCols.length - 1].idx : -1;
  const previousCol = positionCols.length > 1 ? positionCols[positionCols.length - 2].idx : -1;
  // Landing URL is 2 columns after the position column (pos, type, landing)
  const landingCol  = currentCol !== -1 ? currentCol + 2 : -1;

  const diffCol      = headers.findIndex(h => h.includes('_difference'));
  const volumeCol    = findCol(headers, ['Search Volume', 'search volume', 'Volume', 'volumen']);
  const difficultyCol = findCol(headers, ['Keyword Difficulty', 'keyword difficulty', 'KD', 'kd', 'dificultad']);

  if (currentCol === -1) {
    throw new Error(`No se encontraron columnas de posición por fecha. Encabezados detectados: ${headers.slice(0, 5).join(', ')}`);
  }

  const uploadedAt = new Date().toISOString();
  const monthMatch = filename?.match(/\d{4}-\d{2}/);
  // Also try to detect month from last date column
  const lastDate = positionCols.length ? positionCols[positionCols.length - 1].date : null;
  const month = monthMatch
    ? monthMatch[0]
    : lastDate
      ? `${lastDate.substring(0, 4)}-${lastDate.substring(4, 6)}`
      : new Date().toISOString().substring(0, 7);

  const parsePos = (val) => {
    if (!val || val === '-' || val === 'n/a') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  };

  return lines.slice(headerLineIdx + 1).map(line => {
    const cols = splitCsvLine(line, sep);
    const keyword = cols[0]?.trim();
    if (!keyword) return null;

    const pos  = parsePos(cols[currentCol]);
    const prev = parsePos(cols[previousCol]);

    // Use Semrush difference column when available; positive = improved, negative = dropped
    let change = null;
    const diffRaw = diffCol !== -1 ? cols[diffCol] : null;
    if (diffRaw && diffRaw !== '-' && diffRaw !== 'n/a') {
      const d = parseFloat(diffRaw);
      if (!isNaN(d)) change = d;
    } else if (pos !== null && prev !== null) {
      change = prev - pos;
    }

    const url = landingCol !== -1 ? (cols[landingCol] || '') : '';
    const volume = volumeCol !== -1 ? (parseInt(cols[volumeCol]) || null) : null;
    const difficulty = difficultyCol !== -1 ? (parseFloat(cols[difficultyCol]) || null) : null;

    return { keyword, position: pos, prevPosition: prev, change, volume, url, difficulty, month, _uploadedAt: uploadedAt };
  }).filter(Boolean);
}

// ── GA4 endpoints ─────────────────────────────────────────────────────────────

app.get('/api/summary', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics: [
          { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
          { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'conversions' },
          { name: 'engagementRate' }
        ]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const row = response.data.rows?.[0]?.metricValues || [];
    res.json({
      users: parseInt(row[0]?.value) || 0,
      sessions: parseInt(row[1]?.value) || 0,
      pageViews: parseInt(row[2]?.value) || 0,
      bounceRate: ((parseFloat(row[3]?.value) || 0) * 100).toFixed(2),
      avgSessionDuration: row[4]?.value ? `${Math.floor(row[4].value / 60)}m ${Math.floor(row[4].value % 60)}s` : '0m',
      avgSessionDurationSeconds: Math.round(parseFloat(row[4]?.value) || 0),
      conversions: parseInt(row[5]?.value) || 0,
      engagementRate: Number(((parseFloat(row[6]?.value) || 0) * 100).toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/traffic', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const traffic = (response.data.rows || []).map(row => {
      const d = row.dimensionValues?.[0]?.value || '';
      const date = new Date(d.substring(0,4), parseInt(d.substring(4,6))-1, d.substring(6,8));
      return {
        date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        users: parseInt(row.metricValues?.[0]?.value) || 0,
        sessions: parseInt(row.metricValues?.[1]?.value) || 0,
        pageViews: parseInt(row.metricValues?.[2]?.value) || 0
      };
    });
    res.json(traffic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/top-pages', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json((response.data.rows || []).map(row => ({
      page: row.dimensionValues?.[0]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value) || 0,
      users: parseInt(row.metricValues?.[1]?.value) || 0,
      engagementRate: ((parseFloat(row.metricValues?.[2]?.value) || 0) * 100).toFixed(2)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rows = response.data.rows || [];
    const total = rows.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value || 0), 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    res.json(rows.map((row, i) => {
      const name = row.dimensionValues?.[0]?.value || 'Unknown';
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: total > 0 ? Math.round((parseInt(row.metricValues?.[0]?.value || 0) / total) * 100) : 0,
        color: colors[i % colors.length]
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sources', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rows = response.data.rows || [];
    const total = rows.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value || 0), 0);
    res.json(rows.map(row => ({
      source: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: parseInt(row.metricValues?.[0]?.value) || 0,
      percentage: total > 0 ? Math.round((parseInt(row.metricValues?.[0]?.value || 0) / total) * 100) : 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/channel-quality', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
          { name: 'conversions' }
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json((response.data.rows || []).map(row => ({
      channel: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value) || 0,
      sessions: parseInt(row.metricValues?.[1]?.value) || 0,
      avgSessionDurationSeconds: Math.round(parseFloat(row.metricValues?.[2]?.value) || 0),
      engagementRate: Number(((parseFloat(row.metricValues?.[3]?.value) || 0) * 100).toFixed(2)),
      conversions: parseInt(row.metricValues?.[4]?.value) || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/geo', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json((response.data.rows || []).map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value) || 0,
      sessions: parseInt(row.metricValues?.[1]?.value) || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/new-vs-returning', async (req, res) => {
  try {
    const dateRange = resolveDateRange(req.query);
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }]
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rows = response.data.rows || [];
    const total = rows.reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value || 0), 0);
    res.json(rows.map(row => {
      const label = row.dimensionValues?.[0]?.value || 'unknown';
      return {
        name: label === 'new' ? 'Nuevos' : 'Recurrentes',
        users: parseInt(row.metricValues?.[0]?.value) || 0,
        percentage: total > 0 ? Math.round((parseInt(row.metricValues?.[0]?.value || 0) / total) * 100) : 0,
        color: label === 'new' ? '#3b82f6' : '#10b981'
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monthly-comparison', async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months || '6'), 2), 12);
    const closedRanges = getClosedMonthlyRanges(months);
    const currentRange = getCurrentMonthRange();
    const token = await getAccessToken();

    const fetchRange = async (range) => {
      const response = await axios.post(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' }
          ]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const values = response.data.rows?.[0]?.metricValues || [];
      return {
        month: range.label,
        startDate: range.startDate,
        endDate: range.endDate,
        isPartial: range.isPartial,
        dayOfMonth: range.dayOfMonth || null,
        users: parseInt(values[0]?.value) || 0,
        sessions: parseInt(values[1]?.value) || 0,
        pageViews: parseInt(values[2]?.value) || 0,
        engagementRate: Number(((parseFloat(values[3]?.value) || 0) * 100).toFixed(2)),
        avgSessionDurationSeconds: Math.round(parseFloat(values[4]?.value) || 0),
        conversions: parseInt(values[5]?.value) || 0
      };
    };

    const [closedMonths, currentMonth] = await Promise.all([
      Promise.all(closedRanges.map(fetchRange)),
      fetchRange(currentRange)
    ]);

    res.json({ closedMonths, currentMonth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Search Console endpoints ───────────────────────────────────────────────────

app.get('/api/search-console/queries', async (req, res) => {
  if (!SEARCH_CONSOLE_SITE_URL) {
    return res.status(400).json({ error: 'SEARCH_CONSOLE_SITE_URL no configurado. Agrégalo como variable de entorno en Render.' });
  }
  try {
    const dateRange = resolveDateRange(req.query, 28);
    const token = await getSearchConsoleAccessToken();
    const encodedSite = encodeURIComponent(SEARCH_CONSOLE_SITE_URL);

    const response = await axios.post(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions: ['query'],
        rowLimit: 25,
        dataState: 'all'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json((response.data.rows || []).map(r => ({
      keyword:     r.keys[0],
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         Number((r.ctr * 100).toFixed(2)),
      position:    Number(r.position.toFixed(1))
    })));
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.get('/api/search-console/pages', async (req, res) => {
  if (!SEARCH_CONSOLE_SITE_URL) {
    return res.status(400).json({ error: 'SEARCH_CONSOLE_SITE_URL no configurado.' });
  }
  try {
    const dateRange = resolveDateRange(req.query, 28);
    const token = await getSearchConsoleAccessToken();
    const encodedSite = encodeURIComponent(SEARCH_CONSOLE_SITE_URL);

    const response = await axios.post(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions: ['page'],
        rowLimit: 15,
        dataState: 'all'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const base = SEARCH_CONSOLE_SITE_URL.replace(/\/$/, '');
    res.json((response.data.rows || []).map(r => ({
      page:        r.keys[0].replace(base, '') || '/',
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         Number((r.ctr * 100).toFixed(2)),
      position:    Number(r.position.toFixed(1))
    })));
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ── Semrush CSV upload (admin, PIN protected) ─────────────────────────────────

app.post('/admin/upload', async (req, res) => {
  const { pin, csv, filename } = req.body;
  if (!pin || pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN incorrecto' });
  if (!csv) return res.status(400).json({ error: 'CSV requerido' });
  try {
    const parsed = parseSemrushCsv(csv, filename || '');
    semrushData = parsed;
    await saveToGist(parsed);
    res.json({ success: true, rows: parsed.length, month: parsed[0]?.month || null });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Decision matrix ───────────────────────────────────────────────────────────

app.get('/api/decision-matrix', async (req, res) => {
  try {
    // Fetch SC queries for last 30 days
    let scMap = {};
    if (SEARCH_CONSOLE_SITE_URL) {
      try {
        const end = new Date(); end.setDate(end.getDate() - 3);
        const start = new Date(end); start.setDate(start.getDate() - 30);
        const fmt = d => d.toISOString().split('T')[0];
        const token = await getSearchConsoleAccessToken();
        const encodedSite = encodeURIComponent(SEARCH_CONSOLE_SITE_URL);
        const scRes = await axios.post(
          `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
          { startDate: fmt(start), endDate: fmt(end), dimensions: ['query'], rowLimit: 500, dataState: 'all' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        (scRes.data.rows || []).forEach(r => {
          scMap[r.keys[0].toLowerCase()] = {
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: Number((r.ctr * 100).toFixed(2)),
            scPosition: Number(r.position.toFixed(1))
          };
        });
      } catch {}
    }

    const rows = semrushData.map(kw => {
      const sc = scMap[kw.keyword?.toLowerCase()] || null;
      const actions = [];
      let priority = 0;

      const pos = kw.position;
      const change = kw.change;
      const vol = kw.volume || 0;
      const impressions = sc?.impressions || 0;
      const ctr = sc?.ctr ?? null;

      if (change !== null && change <= -3) { actions.push({ type: 'RIESGO', label: 'Perdiendo posiciones', color: 'red' }); priority += 40; }
      if (pos !== null && pos > 3 && pos <= 10 && change !== null && change <= -2) { actions.push({ type: 'URGENTE', label: 'Bajando cerca del top 3', color: 'red' }); priority += 30; }
      if (impressions > 50 && ctr !== null && ctr < 3) { actions.push({ type: 'CTR', label: 'Mejorar título/meta', color: 'yellow' }); priority += 20; }
      if (pos !== null && pos > 3 && pos <= 10 && vol > 30) { actions.push({ type: 'SEO', label: 'Reforzar SEO — cerca del top 3', color: 'blue' }); priority += 15; }
      if (pos !== null && pos > 10 && (vol > 50 || impressions > 100)) { actions.push({ type: 'PAUTA', label: 'Evaluar pauta temporal', color: 'purple' }); priority += 12; }
      if (pos !== null && pos <= 3 && (change === null || change >= 0)) { actions.push({ type: 'OK', label: 'Mantener', color: 'green' }); priority += 2; }
      if (actions.length === 0) { actions.push({ type: 'MONITOREAR', label: 'Monitorear', color: 'gray' }); }

      return { keyword: kw.keyword, position: pos, change, volume: vol, landing: kw.landing || null, month: kw.month || null, sc, actions, priority };
    });

    rows.sort((a, b) => b.priority - a.priority);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Competitor audit ──────────────────────────────────────────────────────────

const COMPETITORS = [
  {
    name: 'Refrigeración Omega', domain: 'refrigeracion-omega.com', isOwn: true,
    segment: 'own', region: 'CR', threat: null, docScore: 100,
    blog: true, ecom: true, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Líder en refrigeración industrial y comercial en Costa Rica. 8 sucursales, fabricación propia. Catálogo completo: refrigeración, cocción, acero inoxidable, aires acondicionados y proyectos llave en mano.',
    analysis: 'Referencia del mercado digital. Score máximo 100/100. Único con e-commerce activo y cobertura nacional completa.'
  },
  {
    name: 'RSF', domain: 'rsfcr.com',
    segment: 'industrial', region: 'CR', threat: 'Alta', docScore: 45,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Refrigeración industrial y comercial. Proyectos integrales HVAC. Empresa con presencia regional y sólida reputación técnica.',
    analysis: 'Mayor competidor directo en proyectos industriales. Equipo de ingenieros especializados. Sin blog pero con Analytics. Debilidad: nula presencia en contenido SEO.'
  },
  {
    name: 'RCR Refrigeración', domain: 'proyectosrefrigeracion.com',
    segment: 'industrial', region: 'CR', threat: 'Alta', docScore: 40,
    blog: false, ecom: false, whatsapp: false, social: true, analyticsActive: true,
    enfoque: 'Cuartos fríos, construcción frigorífica, supermercados, CEDIS y agroindustria. Opera en México, Costa Rica y Guatemala.',
    analysis: 'Competidor regional fuerte. Proyectos llave en mano para grandes superficies. Sin WhatsApp visible ni estrategia de contenido.'
  },
  {
    name: 'EcoClima CR', domain: 'ecoclimacr.com',
    segment: 'industrial', region: 'CR', threat: 'Media', docScore: 70,
    blog: true, ecom: false, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Cuartos fríos, refrigeración industrial, HVAC y soluciones con refrigerantes ecológicos (CO2, R-290).',
    analysis: 'Competidor digital más desarrollado del segmento industrial. Blog activo con artículos técnicos de buena calidad SEO. Puede ganar terreno orgánico en búsquedas de cuartos fríos.'
  },
  {
    name: 'Aislamart', domain: 'aislamart.co.cr',
    segment: 'industrial', region: 'CR', threat: 'Media', docScore: 70,
    blog: true, ecom: false, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Distribuidor exclusivo paneles Globe (Italia). Stock inmediato en Heredia. Paneles sandwich para cuartos fríos, naves industriales y granjas.',
    analysis: 'Bien posicionado en búsquedas de paneles sandwich. Blog activo con contenido técnico. Amenaza directa en el segmento de cerramientos y paneles frigoríficos.'
  },
  {
    name: 'Panel Sandwich Group', domain: 'panelsandwich.cr',
    segment: 'industrial', region: 'CR', threat: 'Baja', docScore: 65,
    blog: true, ecom: false, whatsapp: true, social: false, analyticsActive: true,
    enfoque: 'Paneles sandwich frigoríficos para cuartos fríos, cámaras de congelación y cubiertas industriales.',
    analysis: 'Muy enfocado en nicho específico. Blog con artículos técnicos sobre paneles. Sin redes sociales activas. No compite en el espectro completo de Omega.'
  },
  {
    name: 'Equinox CR', domain: 'equinoxcr.com',
    segment: 'industrial', region: 'CR', threat: 'Media', docScore: 35,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: false,
    enfoque: 'Proyectos de construcción en acero inoxidable para industria alimentaria y cocinas profesionales.',
    analysis: 'Competidor directo en el nicho de proyectos inox. Presencia digital muy básica — oportunidad para Omega de dominar ese segmento orgánicamente con contenido.'
  },
  {
    name: 'Cuesa Construcciones', domain: 'cuesacr.com',
    segment: 'industrial', region: 'CR', threat: 'Media', docScore: 35,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: false,
    enfoque: 'Construcción y diseño industrial. Proyectos de infraestructura para el sector frío.',
    analysis: 'Presencia digital mínima. Compite más por relaciones comerciales que por digital. Sin estrategia SEO visible.'
  },
  {
    name: 'Froztec', domain: 'froztec.com',
    segment: 'industrial', region: 'INTL', threat: 'Baja', docScore: 65,
    blog: true, ecom: false, whatsapp: false, social: true, analyticsActive: true,
    enfoque: 'Cuartos fríos industriales y refrigeración industrial a gran escala. Referente internacional.',
    analysis: 'No es competidor directo en CR pero marca el estándar de la industria. Útil como referencia para benchmarking de contenido técnico.'
  },
  {
    name: 'Tips CR', domain: 'tipscr.com',
    segment: 'comercial', region: 'CR', threat: 'Alta', docScore: 80,
    blog: false, ecom: true, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Más de 6,000 productos HORECA online. Marca propia U-Star. Atiende hoteles, restaurantes, cafeterías y hogares.',
    analysis: 'Principal amenaza comercial. Tienda online robusta con catálogo masivo. Distribuidores de Torrey y U-Star. Fuerte en cocinas profesionales.'
  },
  {
    name: 'Beirute', domain: 'beirute.com',
    segment: 'comercial', region: 'CR', threat: 'Alta', docScore: 80,
    blog: false, ecom: true, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Retailer establecido. Electrónica, hogar, refrigeración y electrodomésticos. Catálogo amplio con e-commerce activo.',
    analysis: 'Competidor fuerte por volumen y reconocimiento de marca. Compite en refrigeración de consumo masivo. E-commerce es amenaza directa para ventas en línea.'
  },
  {
    name: 'Jopco', domain: 'jopco.net',
    segment: 'comercial', region: 'CR', threat: 'Alta', docScore: 60,
    blog: true, ecom: false, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Refrigeración y carnicería para hoteles y restaurantes. Marcas Atosa, Imbera y Fagor. Ubicado en Escazú.',
    analysis: 'Blog activo con artículos de productos — buen esfuerzo SEO sistemático. Especializado en HORECA. Competidor directo en equipos de refrigeración comercial.'
  },
  {
    name: 'Fulzer', domain: 'fulzer.com',
    segment: 'comercial', region: 'CR', threat: 'Media', docScore: 45,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Ex Keith & Ramírez. Fabricante de mobiliario inox e importador de refrigeración True. Enfocado en hotelería y cadenas de comida rápida.',
    analysis: 'Posicionado en segmento premium con marca True. Debilidad: falta de contenido digital. Compite con Omega en acero inoxidable y refrigeración para grandes cadenas.'
  },
  {
    name: 'Carbone Store', domain: 'carbonestore.cr',
    segment: 'comercial', region: 'CR', threat: 'Media', docScore: 65,
    blog: false, ecom: true, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Equipos comerciales con tienda online activa. Creciendo en el segmento de venta digital de equipos.',
    analysis: 'E-commerce activo en crecimiento. A vigilar por su dinámica de ventas online. Buena presencia en redes sociales.'
  },
  {
    name: 'Leaho', domain: 'leaho.com',
    segment: 'comercial', region: 'CR', threat: 'Media', docScore: 65,
    blog: false, ecom: true, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Equipos y accesorios para restaurantes. Tienda online activa para el segmento HORECA.',
    analysis: 'Tienda online con buena experiencia de usuario. Competidor en el segmento de equipos para restaurantes.'
  },
  {
    name: 'Electrofrio CR', domain: 'electrofriocr.com',
    segment: 'comercial', region: 'CR', threat: 'Media', docScore: 45,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: true,
    enfoque: 'Distribuidor Fogel. Más de 30 años en el mercado. Equipos para supermercados, restaurantes y panaderías. Santo Domingo de Heredia.',
    analysis: 'Empresa con larga trayectoria y reputación establecida. Sin estrategia digital activa. Su fuerza es la relación comercial tradicional.'
  },
  {
    name: 'Equipos Nieto', domain: 'equiposnieto.com',
    segment: 'comercial', region: 'CR', threat: 'Baja', docScore: 35,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: false,
    enfoque: 'Equipos de cocina y refrigeración comercial para el mercado costarricense.',
    analysis: 'Presencia digital básica. Sin estrategia SEO visible. Competidor menor en el segmento.'
  },
  {
    name: 'Refrimundo', domain: 'refrimundo.com',
    segment: 'comercial', region: 'CR', threat: 'Baja', docScore: 35,
    blog: false, ecom: false, whatsapp: true, social: true, analyticsActive: false,
    enfoque: 'Refrigeración y servicio técnico en Costa Rica.',
    analysis: 'Enfocado más en servicio técnico que en venta de equipos nuevos. Presencia digital limitada.'
  },
  {
    name: 'Equipos AB', domain: 'equiposab.com',
    segment: 'comercial', region: 'CR', threat: 'Baja', docScore: 25,
    blog: false, ecom: false, whatsapp: true, social: false, analyticsActive: false,
    enfoque: 'Equipos gastronómicos y refrigeración comercial.',
    analysis: 'Presencia digital muy básica. Sin redes sociales activas ni estrategia SEO. Competidor menor.'
  },
  {
    name: 'Frio Aire', domain: 'frioaire.com',
    segment: 'comercial', region: 'INTL', threat: 'Baja', docScore: 65,
    blog: true, ecom: false, whatsapp: false, social: true, analyticsActive: true,
    enfoque: 'Refrigeración comercial regional. Cobertura en varios países de Latinoamérica.',
    analysis: 'Competidor internacional con buen sitio web. No opera directamente en CR pero puede influir en búsquedas de marca regional.'
  },
  {
    name: 'Restaurant Supply', domain: 'restaurantsupply.com',
    segment: 'comercial', region: 'INTL', threat: 'Baja', docScore: 90,
    blog: true, ecom: true, whatsapp: false, social: true, analyticsActive: true,
    enfoque: 'E-commerce masivo de equipos para restaurantes. Referente del mercado en USA.',
    analysis: 'No es competidor directo en CR pero marca el estándar global de e-commerce del sector. Referencia para benchmarking de tienda online.'
  },
  {
    name: 'Webstaurant Store', domain: 'webstaurantstore.com',
    segment: 'comercial', region: 'INTL', threat: 'Baja', docScore: 95,
    blog: true, ecom: true, whatsapp: false, social: true, analyticsActive: true,
    enfoque: 'Líder mundial en venta online de equipos para restaurantes. Millones de productos. Referente global del sector.',
    analysis: 'El mayor referente digital de la industria a nivel global. No compite en CR pero es el benchmark de lo que un e-commerce del sector puede alcanzar.'
  }
];

const COMPETITOR_USPS = {
  'refrigeracion-omega.com': 'Fabricación propia · 8 sucursales nacionales · catálogo más completo del mercado CR',
  'rsfcr.com':               'Ingeniería HVAC especializada — reputación técnica en proyectos industriales grandes',
  'proyectosrefrigeracion.com': 'Proyectos llave en mano a escala regional (CR · México · Guatemala)',
  'ecoclimacr.com':          'Único especialista en refrigerantes ecológicos CO2/R-290 en Costa Rica',
  'aislamart.co.cr':         'Distribuidor exclusivo Globe Italia + stock inmediato en Heredia',
  'panelsandwich.cr':        'Máxima especialización en paneles sandwich frigoríficos',
  'equinoxcr.com':           'Fabricación en acero inoxidable a medida para industria alimentaria',
  'cuesacr.com':             'Construcción frigorífica industrial — relaciones B2B de largo plazo',
  'froztec.com':             'Referente mundial de cuartos fríos industriales a gran escala',
  'tipscr.com':              'Más de 6,000 productos HORECA online + marca propia U-Star',
  'beirute.com':             'Mayor reconocimiento de marca masivo en CR + volumen y variedad',
  'jopco.net':               'Blog SEO activo + especialización en HORECA con Atosa, Imbera y Fagor',
  'fulzer.com':              'Marca True (segmento premium) + fabricación propia inox para grandes cadenas',
  'carbonestore.cr':         'E-commerce en crecimiento con catálogo digital competitivo',
  'leaho.com':               'Tienda online HORECA con buena experiencia de usuario',
  'electrofriocr.com':       'Más de 30 años de trayectoria + distribuidor exclusivo Fogel',
  'equiposnieto.com':        'Venta local de cocina y refrigeración comercial en Costa Rica',
  'refrimundo.com':          'Especialización en servicio técnico de refrigeración',
  'equiposab.com':           'Acceso local a equipos gastronómicos básicos a precio accesible',
  'frioaire.com':            'Distribución y cobertura regional en varios países de Latinoamérica',
  'restaurantsupply.com':    'Benchmark global e-commerce — catálogo masivo de restaurantes USA',
  'webstaurantstore.com':    'Líder mundial online de equipos para restaurantes — millones de productos'
};

let competitorCache = { data: null, fetchedAt: null };

function extractMeta(html, domain) {
  const get = (pattern) => { const m = html.match(pattern); return m ? m[1].replace(/<[^>]+>/g, '').trim().substring(0, 160) : null; };
  const count = (pattern) => (html.match(pattern) || []).length;

  const title       = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1          = get(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const description = get(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{0,300})/i)
                   || get(/<meta[^>]*content=["']([^"']{0,300})["'][^>]*name=["']description["']/i);
  const h2Count     = count(/<h2[\s>]/gi);
  const h3Count     = count(/<h3[\s>]/gi);
  const hasSchema   = /application\/ld\+json|schema\.org/i.test(html);
  const hasOG       = /<meta[^>]*property=["']og:/i.test(html);
  const imgCount    = count(/<img[\s>]/gi);
  const imgAltMissing = count(/<img(?![^>]*\balt=)[^>]*>/gi);
  const hasWhatsApp = /whatsapp|wa\.me/i.test(html);
  const hasPhone    = /tel:|phone|teléfono/i.test(html);
  const internalLinks = count(new RegExp(`href=["'][^"']*${domain}[^"']*["']`, 'gi'));

  let seoScore = 0;
  if (title && title.length >= 30 && title.length <= 65) seoScore += 20;
  else if (title) seoScore += 10;
  if (h1) seoScore += 20;
  if (description && description.length >= 100) seoScore += 20;
  else if (description) seoScore += 10;
  if (hasSchema) seoScore += 15;
  if (hasOG) seoScore += 10;
  if (h2Count >= 2) seoScore += 10;
  if (imgAltMissing === 0 && imgCount > 0) seoScore += 5;

  return { title, h1, description, h2Count, h3Count, hasSchema, hasOG, imgCount, imgAltMissing, hasWhatsApp, hasPhone, seoScore };
}

async function auditSite(competitor) {
  const url = `https://${competitor.domain}`;
  const start = Date.now();
  try {
    const r = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmegaDashBot/1.0)' },
      validateStatus: s => s < 500
    });
    const responseTime = Date.now() - start;
    const https = url.startsWith('https');
    const meta = extractMeta(r.data || '', competitor.domain);
    const usp = COMPETITOR_USPS[competitor.domain] || null;
    return { ...competitor, url, https, responseTime, status: r.status, error: null, ...meta, usp, auditedAt: new Date().toISOString() };
  } catch (err) {
    const usp = COMPETITOR_USPS[competitor.domain] || null;
    return { ...competitor, url, https: true, responseTime: Date.now() - start, status: null, error: err.code || err.message, title: null, h1: null, description: null, h2Count: 0, h3Count: 0, hasSchema: false, hasOG: false, imgCount: 0, imgAltMissing: 0, hasWhatsApp: false, hasPhone: false, seoScore: 0, usp, auditedAt: new Date().toISOString() };
  }
}

async function runCompetitorAudit() {
  const results = [];
  const batchSize = 4;
  for (let i = 0; i < COMPETITORS.length; i += batchSize) {
    const batch = COMPETITORS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(auditSite));
    results.push(...batchResults);
  }
  return results;
}

app.get('/api/competitors', async (req, res) => {
  const maxAge = 6 * 60 * 60 * 1000; // 6 hours
  const force = req.query.refresh === '1';
  if (!force && competitorCache.data && competitorCache.fetchedAt && Date.now() - competitorCache.fetchedAt < maxAge) {
    return res.json({ data: competitorCache.data, cachedAt: competitorCache.fetchedAt, fromCache: true });
  }
  try {
    const data = await runCompetitorAudit();
    competitorCache = { data, fetchedAt: Date.now() };
    res.json({ data, cachedAt: competitorCache.fetchedAt, fromCache: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/keywords', (req, res) => {
  res.json({
    rows: semrushData,
    count: semrushData.length,
    lastUpdate: semrushData[0]?._uploadedAt || null
  });
});

// ── Health + index ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    propertyId,
    searchConsole: Boolean(SEARCH_CONSOLE_SITE_URL),
    authenticated: hasServiceAccount || hasRefreshToken || !!storedTokens,
    authMode: hasServiceAccount ? 'service_account' : (hasRefreshToken ? 'refresh_token' : 'oauth'),
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Analytics Dashboard Backend',
    endpoints: [
      '/auth/login', '/auth/status', '/api/health',
      '/api/summary', '/api/monthly-comparison', '/api/traffic',
      '/api/top-pages', '/api/devices', '/api/sources',
      '/api/channel-quality', '/api/geo', '/api/new-vs-returning',
      '/api/search-console/queries', '/api/search-console/pages',
      '/api/keywords', '/admin/upload'
    ]
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});
