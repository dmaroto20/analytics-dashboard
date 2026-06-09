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
app.use(express.json());

const propertyId = process.env.PROPERTY_ID || '414258625';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://analytics-dashboard-7teo.onrender.com/auth/callback';
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

let storedTokens = null;
let serviceAccountToken = null;

const hasServiceAccount = Boolean(SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY);

// Auth - redirigir a Google
app.get('/auth/login', (req, res) => {
  if (hasServiceAccount) {
    return res.send(`
      <html>
        <body style="background:#0f172a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="font-size:48px">✅</h1>
            <h2>Google Analytics ya está conectado</h2>
            <p style="color:#94a3b8">El dashboard usa una cuenta de servicio del servidor.</p>
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

// Auth - callback de Google
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

// Auth - estado
app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: hasServiceAccount || !!storedTokens,
    mode: hasServiceAccount ? 'service_account' : 'oauth'
  });
});

const getServiceAccountToken = async () => {
  if (serviceAccountToken?.expires_at && Date.now() < serviceAccountToken.expires_at - 60000) {
    return serviceAccountToken.access_token;
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: GA_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      exp: now + 3600,
      iat: now
    },
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

// Obtener access token válido
const getAccessToken = async () => {
  if (hasServiceAccount) return getServiceAccountToken();

  if (!storedTokens) throw new Error('No autenticado. Visita /auth/login primero.');
  
  if (storedTokens.expires_at && Date.now() > storedTokens.expires_at - 60000) {
    if (!storedTokens.refresh_token) {
      storedTokens = null;
      throw new Error('La sesión expiró. Visita /auth/login para autorizar de nuevo.');
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: storedTokens.refresh_token,
      grant_type: 'refresh_token'
    });
    storedTokens = { ...storedTokens, ...response.data, expires_at: Date.now() + response.data.expires_in * 1000 };
  }
  return storedTokens.access_token;
};

const getDateRange = (days) => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { startDate, endDate };
};

// Summary
app.get('/api/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
    const token = await getAccessToken();

    const response = await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics: [
          { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
          { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'conversions' }
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
      conversions: parseInt(row[5]?.value) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Traffic
app.get('/api/traffic', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
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

// Top pages
app.get('/api/top-pages', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
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

// Devices
app.get('/api/devices', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
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

// Sources
app.get('/api/sources', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
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

// Geo
app.get('/api/geo', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
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

// New vs Returning
app.get('/api/new-vs-returning', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));
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

// Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    propertyId,
    authenticated: hasServiceAccount || !!storedTokens,
    authMode: hasServiceAccount ? 'service_account' : 'oauth',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Analytics Dashboard Backend',
    endpoints: ['/auth/login', '/auth/status', '/api/health', '/api/summary', '/api/traffic', '/api/top-pages', '/api/devices', '/api/sources', '/api/geo', '/api/new-vs-returning']
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});
