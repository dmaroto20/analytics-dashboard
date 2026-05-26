const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const propertyId = process.env.PROPERTY_ID || '414258625';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://analytics-dashboard-7teo.onrender.com/auth/callback';

let storedTokens = null;

// Auth - redirigir a Google
app.get('/auth/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
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
    storedTokens = response.data;
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
  res.json({ authenticated: !!storedTokens });
});

// Obtener access token válido
const getAccessToken = async () => {
  if (!storedTokens) throw new Error('No autenticado. Visita /auth/login primero.');
  
  if (storedTokens.expires_at && Date.now() > storedTokens.expires_at - 60000) {
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
        dimensions: [{ name: 'pagePathAndQueryString' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json((response.data.rows || []).map(row => ({
      page: row.dimensionValues?.[0]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value) || 0,
      users: parseInt(row.metricValues?.[1]?.value) || 0,
      bounceRate: ((parseFloat(row.metricValues?.[2]?.value) || 0) * 100).toFixed(2)
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

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', propertyId, authenticated: !!storedTokens, timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Analytics Dashboard Backend', endpoints: ['/auth/login', '/auth/status', '/api/health', '/api/summary', '/api/traffic', '/api/top-pages', '/api/devices'] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});
