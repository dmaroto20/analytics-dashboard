import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Calendar, TrendingUp, Users, Eye, Target, Lock, LogOut, AlertCircle, Zap } from 'lucide-react';

const GADashboard = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30days');
  const [backendUrl, setBackendUrlState] = useState(localStorage.getItem('backendUrl') || '');
  const [settingBackend, setSettingBackend] = useState(!backendUrl);
  const pinInputRef = useRef(null);

  // Mapeo de días
  const getDaysFromRange = (range) => {
    const map = { '7days': 7, '30days': 30, '90days': 90 };
    return map[range] || 30;
  };

  // Obtener datos del backend
  const fetchDataFromBackend = async (url, days) => {
    try {
      setLoading(true);
      setError('');

      const [summary, traffic, topPages, devices] = await Promise.all([
        fetch(`${url}/api/summary?days=${days}`).then(r => {
          if (!r.ok) throw new Error('Error en summary');
          return r.json();
        }),
        fetch(`${url}/api/traffic?days=${days}`).then(r => {
          if (!r.ok) throw new Error('Error en traffic');
          return r.json();
        }),
        fetch(`${url}/api/top-pages?days=${days}`).then(r => {
          if (!r.ok) throw new Error('Error en top-pages');
          return r.json();
        }),
        fetch(`${url}/api/devices?days=${days}`).then(r => {
          if (!r.ok) throw new Error('Error en devices');
          return r.json();
        })
      ]);

      setData({
        summary,
        traffic,
        topPages,
        deviceBreakdown: devices
      });

      return true;
    } catch (err) {
      setError(`Error conectando al backend: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSetBackend = async () => {
    if (!backendUrl.trim()) {
      setError('Ingresa la URL del backend');
      return;
    }

    // Validar que el backend esté disponible
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/health`);
      if (!response.ok) throw new Error('Backend no responde');

      localStorage.setItem('backendUrl', backendUrl);
      setSettingBackend(false);
      setError('');
      setLoading(false);
    } catch (err) {
      setError('No se puede conectar al backend. Verifica la URL.');
      setLoading(false);
    }
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

  const handleAuthenticate = async () => {
    if (pinInput === pin) {
      setAuthenticated(true);
      setPinInput('');
      await loadData();
    } else {
      setError('PIN incorrecto');
      setPinInput('');
    }
  };

  const loadData = async () => {
    const days = getDaysFromRange(dateRange);
    await fetchDataFromBackend(backendUrl, days);
  };

  const logout = () => {
    setAuthenticated(false);
    setData(null);
    setPinInput('');
  };

  // Pantalla: Configurar Backend
  if (settingBackend) {
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
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Configurar Backend</h1>
              <p className="text-slate-400 text-sm">Ingresa la URL de tu servidor</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">URL del Backend</label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrlState(e.target.value)}
                  placeholder="ej: https://mi-analytics.onrender.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  onKeyPress={(e) => e.key === 'Enter' && handleSetBackend()}
                />
              </div>

              <p className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded">
                💡 <strong>Tip:</strong> Si es local: <code>http://localhost:3000</code>
              </p>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSetBackend}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition disabled:opacity-50"
              >
                {loading ? 'Conectando...' : 'Conectar Backend'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla: Crear PIN
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

  // Pantalla: Ingresar PIN
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

  // Dashboard Principal
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
            <p className="text-slate-400 text-sm">Datos en tiempo real de Google Analytics</p>
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
        {/* Date Range Selector */}
        <div className="mb-8 flex gap-3">
          {['7days', '30days', '90days'].map((range) => (
            <button
              key={range}
              onClick={() => {
                setDateRange(range);
                fetchDataFromBackend(backendUrl, getDaysFromRange(range));
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

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm"><strong>Error:</strong> {error}</p>
            </div>
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
                <div className="stat-value text-2xl">{data.summary.users?.toLocaleString() || 0}</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Sesiones</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.sessions?.toLocaleString() || 0}</div>
              </div>
              <div className="metric-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Vistas</span>
                  <Eye className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.pageViews?.toLocaleString() || 0}</div>
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
                  <span className="text-slate-400 text-xs uppercase tracking-wide">Conversiones</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="stat-value text-2xl">{data.summary.conversions?.toLocaleString() || 0}</div>
              </div>
            </div>

            {/* Charts */}
            {data.traffic && data.traffic.length > 0 && (
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

                {data.deviceBreakdown && data.deviceBreakdown.length > 0 && (
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
                )}
              </div>
            )}

            {/* Top Pages */}
            {data.topPages && data.topPages.length > 0 && (
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
                          <td className="py-3 px-4 text-white font-mono text-sm truncate">{page.page}</td>
                          <td className="text-right py-3 px-4 text-slate-300">{page.views?.toLocaleString() || 0}</td>
                          <td className="text-right py-3 px-4 text-slate-300">{page.users?.toLocaleString() || 0}</td>
                          <td className="text-right py-3 px-4 text-orange-400">{page.bounceRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GADashboard;
