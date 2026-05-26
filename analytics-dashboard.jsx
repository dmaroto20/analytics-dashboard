import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Calendar, TrendingUp, Users, Eye, Target, Lock, LogOut } from 'lucide-react';

const AnalyticsDashboard = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30days');
  const pinInputRef = useRef(null);

  // Datos de ejemplo (en producción, vendrían de Google Analytics API)
  const mockData = {
    summary: {
      users: 15420,
      sessions: 22840,
      pageViews: 58920,
      bounceRate: 42.5,
      avgSessionDuration: '3m 24s',
      conversionRate: 3.2,
    },
    traffic: [
      { date: '1 May', users: 2400, sessions: 3200, pageViews: 5200 },
      { date: '2 May', users: 2210, sessions: 3100, pageViews: 5100 },
      { date: '3 May', users: 2290, sessions: 3300, pageViews: 5500 },
      { date: '4 May', users: 2000, sessions: 2800, pageViews: 4800 },
      { date: '5 May', users: 2181, sessions: 3100, pageViews: 5400 },
      { date: '6 May', users: 2500, sessions: 3500, pageViews: 6200 },
      { date: '7 May', users: 2100, sessions: 3000, pageViews: 5100 },
    ],
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
      // Simulamos una carga de datos
      await new Promise(resolve => setTimeout(resolve, 1500));
      setData(mockData);
      setError('');
    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
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
          
          .glow-border {
            position: relative;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1));
            border: 1px solid rgba(59, 130, 246, 0.3);
          }
          
          .pulse-glow {
            animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
            50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
          }
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Crear PIN de acceso
                </label>
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
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition transform hover:scale-105"
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
              <div>
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
              </div>

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
        
        .card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
          border: 1px solid rgba(59, 130, 246, 0.2);
          backdrop-filter: blur(10px);
        }
        
        .metric-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .stat-value {
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-slate-400 text-sm">GA4 Property: 414258625</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadData()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition border border-blue-500/50"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar
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
              onClick={() => setDateRange(range)}
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
              {/* Traffic Chart */}
              <div className="lg:col-span-2 card rounded-lg p-6">
                <h2 className="text-white font-semibold mb-4">Tráfico en el tiempo</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.traffic}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Device Breakdown */}
              <div className="card rounded-lg p-6">
                <h2 className="text-white font-semibold mb-4">Dispositivos</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
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

export default AnalyticsDashboard;