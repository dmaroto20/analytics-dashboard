import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Calendar, TrendingUp, Users, Eye, Target, Lock, LogOut, AlertCircle } from 'lucide-react';

const GADashboard = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30days');
  const [accessToken, setAccessToken] = useState(null);
  const pinInputRef = useRef(null);

  // Configuración de Google Analytics
  const propertyId = '414258625';
  const credentials = {
    type: "service_account",
    project_id: "mi-analytics-dashboard-497515",
    private_key_id: "6094a41fb5e57d0c38508f1b3caec28f619fd8b9",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCcwB66hps3jWWP\nYRuDcw/RqfFzSO/9+qbCDmG5nlcBPTdBXbTBwYoMC0LJTv50imRPmkLCv2dt4Ozm\nEkXn29MoV4FrzmqO7wNhSEf73nxuVleYDSlDbQ89gEHuFSFRijH2GT0zZ7pohE7L\n4OZ3gK/6a0z2KHJSoBsBT4h58+FWf20sqtBKXXQsyiDS3VSvjKBvDuew9wz5NBZX\ncsN0MK0uhJg5bm34HXxUHj8EZewL1yLVXeCfzG/o0E6wBxEjGdX8ZtsycYYt4hDn\nZgVvEGVNIDXi5pJvYsKnDe/TbHjdQaLbysaD5H3IV6WpZFL0IiQRhQBXeupXkamo\nGAIHGQuRAgMBAAECggEAAtvmM5S87q3KNRaaVTLGDmxBFnngFrZ5pX8e/S8MJd5N\n9wfp12ww7mNOMTRwTlkv1zEtwouR1rPhiO4QZFg4E7ufhViFzQbtqC/p+t1l+5qL\njR8VqkB/pKmFilLMVsZkfuPwSn271/2BymosX0WeRWernFnEgV6g33c/OqozaUvG\nYetC93N0yp78PQzphnWAW7HvisTG3qJWPJ/1K6/JnqXMwPgDK3/ioCz+dQoJED/6\nUs2finRLQBkDA9AolBvMFKbQI5mnadGulCq5jEOjYYLBhbFGzpfXYDdj5IL2kMUe\nWcowzEi0yqjuabqJqFy27eV3AjJaZsdka2wW6LQneQKBgQDN5+lRmX2VIqAj/Zgl\no1DItyrKkuXzQcilvKuCwE4luyqPojcA5QY4SBUJsatq5uEN/hE9d4rfkJ2ekkmA\noqeMa+8Kel1V1Zw+/oyuZ6bYTv1QRB7S0OJNzzr87LhuuF1GBmqKpiQi6IsjEdst\nuvH/ml0XgzML4gXLr75ga0fyiwKBgQDC4r5zHbkgak0R0E/pXUEX2s8A1uUz1ACZ\nO6WZ3zoOtd4Wj6DEIW2ejgt//Rlt83riaoOs/geERHBFtovv0eRTdm8UTpxTAoOz\nPqokRh+GduWRJIjRx6Ao34NBcyfjFIpQydZ4cer1Nare096oYsyisVMeupMgm7ZN\nBPLCtLfJ0wKBgHiHp6lvevbAxRMsUFK/7fsAVZktMlQaDvUNoywvm880Z66amy33\n4pMxhrcc/KXgLp99OORNRMqnocx//2zASenGCLCOfnJPT14ErZ8t55m5a0kABzcK\ntV4sz2/ctf2CCH+EI/uzU3XnwAKwYie7xgsEdjfcQhZToWbhIkTYp84PAoGANyHG\nFvLVqGHqI5v2v2HuRD1WSjqA5MSY1sCU/I618etpRKClLlb2l+A/SJnlU8GJhfvz\n/EBxB+4EhPQ7akDKgwICMpB6kNEpSM/1egWMbZG9J+5Z9l6u5GE21JErO4ZYCrrO\nvYwcl/nyuM7fMmug0HWxugO2E4d5bxhzRLmzNJkCgYEAy6V8Vefe1tIE2wWAfF2m\nbC49tMVfPLXfQL1cmZz/F8USMbRvSauACvwiG3U9aP+byn+WN9LxlCl31mdKUH9D\n8MZwCE3N0F5Vsuo4CkqPND+kQhrend/hCViNQpr4chXlTOPCo22fjcimpMj2q2OW\nJ8mvtLADwZDbI9XVFPAv/mo=\n-----END PRIVATE KEY-----\n",
    client_email: "analytics-dashboard@mi-analytics-dashboard-497515.iam.gserviceaccount.com",
    client_id: "112844412336646986392",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/analytics-dashboard%40mi-analytics-dashboard-497515.iam.gserviceaccount.com",
  };

  // Función para generar JWT
  const generateJWT = () => {
    return new Promise((resolve, reject) => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 3600; // 1 hora

      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        iss: credentials.client_email,
        sub: credentials.client_email,
        aud: credentials.token_uri,
        iat: now,
        exp: exp,
        scope: 'https://www.googleapis.com/auth/analytics.readonly'
      }));

      // Nota: Normalmente necesitarías una biblioteca para firmar JWT en cliente
      // Por ahora usaremos una aproximación con el backend
      const jwtToken = `${header}.${payload}.signature`;
      resolve(jwtToken);
    });
  };

  // Obtener access token
  const getAccessToken = async () => {
    try {
      // Llamada al servidor backend para obtener token (necesita estar configurado)
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: await generateJWT(),
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.access_token);
        return data.access_token;
      } else {
        throw new Error('No se pudo obtener token de acceso');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de autenticación. El dashboard funcionará con datos de demostración.');
      return null;
    }
  };

  // Obtener datos de Google Analytics
  const fetchGAData = async (token) => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      let startDate;
      
      if (dateRange === '7days') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else if (dateRange === '30days') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      // Nota: Esta es una llamada de ejemplo. En producción, necesitarías un backend
      // que maneje las credenciales de Google de forma segura
      
      // Por ahora, mostraremos datos de demostración
      loadMockData();
      
    } catch (err) {
      console.error('Error fetching GA data:', err);
      loadMockData(); // Fallback a datos de demostración
    }
  };

  const loadMockData = () => {
    const mockData = {
      summary: {
        users: Math.floor(Math.random() * 20000) + 10000,
        sessions: Math.floor(Math.random() * 30000) + 15000,
        pageViews: Math.floor(Math.random() * 70000) + 40000,
        bounceRate: (Math.random() * 30 + 30).toFixed(1),
        avgSessionDuration: `${Math.floor(Math.random() * 4) + 2}m ${Math.floor(Math.random() * 60)}s`,
        conversionRate: (Math.random() * 5 + 1).toFixed(2),
      },
      traffic: generateTrafficData(),
      topPages: [
        { page: '/home', views: 12400, users: 8420, bounceRate: 35 },
        { page: '/products', views: 9800, users: 6200, bounceRate: 42 },
        { page: '/blog', views: 7650, users: 4900, bounceRate: 48 },
        { page: '/contact', views: 5420, users: 3100, bounceRate: 55 },
      ],
      deviceBreakdown: [
        { name: 'Desktop', value: 45, color: '#3b82f6' },
        { name: 'Mobile', value: 38, color: '#10b981' },
        { name: 'Tablet', value: 17, color: '#f59e0b' },
      ],
    };
    setData(mockData);
  };

  const generateTrafficData = () => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      data.push({
        date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        users: Math.floor(Math.random() * 3000) + 1500,
        sessions: Math.floor(Math.random() * 4000) + 2000,
        pageViews: Math.floor(Math.random() * 7000) + 3000,
      });
    }
    return data;
  };

  const handleSetPin = () => {
    if (pinInput.length >= 4) {
      setPin(pinInput);
      setPinInput('');
      setError('');
    } else {
      setError('PIN debe tener al menos 4 dígitos');
    }
  };

  const handleAuthenticate = () => {
    if (pinInput === pin) {
      setAuthenticated(true);
      setPinInput('');
      loadData();
    } else {
      setError('PIN incorrecto');
      setPinInput('');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      if (token) {
        await fetchGAData(token);
      } else {
        loadMockData();
      }
      setError('');
    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthenticated(false);
    setData(null);
    setPinInput('');
  };

  if (!pin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;700&display=swap');
          body { margin: 0; font-family: 'Outfit', sans-serif; }
          .glow-border { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1)); border: 1px solid rgba(59, 130, 246, 0.3); }
        `}</style>
        
        <div className="w-full max-w-md">
          <div className="glow-border rounded-2xl p-8 backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-blue-500/20 rounded-lg mb-4">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-slate-400 text-sm">Configura un PIN para proteger tu dashboard</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Crear PIN</label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Ingresa 4+ dígitos"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  onKeyPress={(e) => e.key === 'Enter' && handleSetPin()}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSetPin}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition"
              >
                Crear PIN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glow-border rounded-2xl p-8 backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-blue-500/20 rounded-lg mb-4">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Acceso Requerido</h1>
              <p className="text-slate-400 text-sm">Ingresa tu PIN para acceder</p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingresa tu PIN"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
                ref={pinInputRef}
                autoFocus
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleAuthenticate}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition"
              >
                Acceder
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;700&display=swap');
        body { margin: 0; font-family: 'Outfit', sans-serif; }
        .card { background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8)); border: 1px solid rgba(59, 130, 246, 0.2); backdrop-filter: blur(10px); }
        .metric-card { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(59, 130, 246, 0.3); }
        .stat-value { font-family: 'Space Mono', monospace; font-weight: 700; background: linear-gradient(135deg, #3b82f6, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      `}</style>

      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-slate-400 text-sm">GA4 Property: {propertyId}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition border border-blue-500/50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition border border-red-500/50"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm"><strong>Nota:</strong> El dashboard está en modo de demostración. Para datos completamente reales, necesitas configurar un backend que maneje las credenciales de Google de forma segura.</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mb-8 flex gap-3">
          {['7days', '30days', '90days'].map((range) => (
            <button
              key={range}
              onClick={() => {
                setDateRange(range);
                loadData();
              }}
              className={`px-4 py-2 rounded-lg transition ${
                dateRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {range === '7days' ? '7 días' : range === '30days' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <p className="text-slate-400 mt-2">Cargando datos...</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Usuarios</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.users.toLocaleString()}</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Sesiones</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.sessions.toLocaleString()}</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Vistas</span>
                  <Eye className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.pageViews.toLocaleString()}</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Rebote</span>
                  <Target className="w-4 h-4 text-orange-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.bounceRate}%</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Duración</span>
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <div className="stat-value text-lg">{data.summary.avgSessionDuration}</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Conversión</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.conversionRate}%</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 card rounded-lg p-6">
                <h2 className="text-white font-semibold mb-4">Tráfico en el tiempo</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.traffic}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card rounded-lg p-6">
                <h2 className="text-white font-semibold mb-4">Dispositivos</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.deviceBreakdown} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} ${value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {data.deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)' }} labelStyle={{ color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Pages */}
            <div className="card rounded-lg p-6">
              <h2 className="text-white font-semibold mb-4">Páginas más visitadas</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Página</th>
                      <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Vistas</th>
                      <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Usuarios</th>
                      <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Rebote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((page, i) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 text-white font-mono text-sm">{page.page}</td>
                        <td className="text-right py-3 px-4 text-slate-300">{page.views.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-slate-300">{page.users.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-orange-400">{page.bounceRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GADashboard;