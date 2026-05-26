const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuración
const propertyId = process.env.PROPERTY_ID || '414258625';
const credentials = {
  type: "service_account",
  project_id: process.env.PROJECT_ID || "mi-analytics-dashboard-497515",
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: (process.env.PRIVATE_KEY || "").replace(/\\n/g, '\n'),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
};

let cachedAccessToken = null;
let tokenExpiredAt = null;

// Función para generar JWT
const generateJWT = () => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hora

  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: credentials.token_uri,
    iat: now,
    exp: exp,
    scope: 'https://www.googleapis.com/auth/analytics.readonly'
  };

  try {
    const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });
    return token;
  } catch (error) {
    console.error('Error generando JWT:', error);
    throw error;
  }
};

// Función para obtener access token
const getAccessToken = async () => {
  // Si el token está en caché y no ha expirado, usarlo
  if (cachedAccessToken && tokenExpiredAt && Date.now() < tokenExpiredAt) {
    return cachedAccessToken;
  }

  try {
    const jwtToken = generateJWT();
    
    const response = await axios.post(credentials.token_uri, {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken
    });

    cachedAccessToken = response.data.access_token;
    // Guardar token con expiración 55 minutos (para seguridad)
    tokenExpiredAt = Date.now() + (55 * 60 * 1000);

    return cachedAccessToken;
  } catch (error) {
    console.error('Error obteniendo access token:', error.response?.data || error.message);
    throw new Error('No se pudo obtener el access token de Google');
  }
};

// Función auxiliar para calcular fechas
const getDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

// Endpoint: Obtener resumen general
app.get('/api/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));

    const token = await getAccessToken();

    const response = await axios.post(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
      {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const row = response.data.rows[0]?.values || [];
    const summary = {
      users: parseInt(row[0]) || 0,
      sessions: parseInt(row[1]) || 0,
      pageViews: parseInt(row[2]) || 0,
      bounceRate: parseFloat(row[3])?.toFixed(2) || 0,
      avgSessionDuration: row[4] ? `${Math.floor(row[4] / 60)}m ${Math.floor(row[4] % 60)}s` : '0m',
      conversions: parseInt(row[5]) || 0
    };

    res.json(summary);
  } catch (error) {
    console.error('Error en /api/summary:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Obtener tráfico por día
app.get('/api/traffic', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));

    const token = await getAccessToken();

    const response = await axios.post(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
      {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        orderBys: [{ dimension: { name: 'date' }, order: 'ASCENDING' }]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const traffic = response.data.rows?.map(row => {
      const dateStr = row.dimensions[0];
      const date = new Date(dateStr.substring(0, 4), parseInt(dateStr.substring(4, 6)) - 1, dateStr.substring(6, 8));
      
      return {
        date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        users: parseInt(row.values[0]) || 0,
        sessions: parseInt(row.values[1]) || 0,
        pageViews: parseInt(row.values[2]) || 0
      };
    }) || [];

    res.json(traffic);
  } catch (error) {
    console.error('Error en /api/traffic:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Obtener páginas más visitadas
app.get('/api/top-pages', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));

    const token = await getAccessToken();

    const response = await axios.post(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
      {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }],
        dimensions: [{ name: 'pagePathAndQueryString' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' }
        ],
        orderBys: [{ metric: { name: 'screenPageViews' }, order: 'DESCENDING' }],
        limit: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const topPages = response.data.rows?.map(row => ({
      page: row.dimensions[0],
      views: parseInt(row.values[0]) || 0,
      users: parseInt(row.values[1]) || 0,
      bounceRate: parseFloat(row.values[2])?.toFixed(2) || 0
    })) || [];

    res.json(topPages);
  } catch (error) {
    console.error('Error en /api/top-pages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Obtener desglose por dispositivo
app.get('/api/devices', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = getDateRange(parseInt(days));

    const token = await getAccessToken();

    const response = await axios.post(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
      {
        dateRanges: [{
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { name: 'activeUsers' }, order: 'DESCENDING' }]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const devices = response.data.rows || [];
    const total = devices.reduce((sum, row) => sum + parseInt(row.values[0]), 0);

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const breakdown = devices.map((row, i) => ({
      name: row.dimensions[0].charAt(0).toUpperCase() + row.dimensions[0].slice(1),
      value: Math.round((parseInt(row.values[0]) / total) * 100),
      color: colors[i % colors.length]
    }));

    res.json(breakdown);
  } catch (error) {
    console.error('Error en /api/devices:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    propertyId: propertyId,
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'Analytics Dashboard Backend',
    endpoints: [
      'GET /api/health',
      'GET /api/summary?days=30',
      'GET /api/traffic?days=30',
      'GET /api/top-pages?days=30',
      'GET /api/devices?days=30'
    ]
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
  console.log(`Property ID: ${propertyId}`);
});
