import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart as PieChartIcon, Activity, RefreshCw, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { API_BASE } from '../config';

const COLORS = ['#39ff14', '#00f0ff', '#a855f7', '#ec4899', '#eab308', '#f97316', '#ef4444'];

export default function AnalyticsPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denomCountData, setDenomCountData] = useState([]);
  const [denomValueData, setDenomValueData] = useState([]);
  const [activityData, setActivityData] = useState([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        processData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const processData = (data) => {
    if (data.length === 0) return;

    const counts = {
      "₹10": 0,
      "₹20": 0,
      "₹50": 0,
      "₹100": 0,
      "₹200": 0,
      "₹500": 0,
      "₹2000": 0
    };

    const values = {
      "₹10": 0,
      "₹20": 0,
      "₹50": 0,
      "₹100": 0,
      "₹200": 0,
      "₹500": 0,
      "₹2000": 0
    };

    const activity = {};

    data.forEach(item => {
      // Aggregate note counts and values
      Object.entries(item.counts).forEach(([denom, count]) => {
        if (counts[denom] !== undefined) {
          counts[denom] += count;
          const val = parseInt(denom.replace('₹', ''), 10) || 0;
          values[denom] += count * val;
        }
      });

      // Aggregate activity by date
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      activity[dateStr] = (activity[dateStr] || 0) + 1;
    });

    setDenomCountData(
      Object.entries(counts).map(([name, count]) => ({
        name,
        count
      }))
    );

    setDenomValueData(
      Object.entries(values)
        .filter(([_, val]) => val > 0)
        .map(([name, value]) => ({
          name,
          value
        }))
    );

    setActivityData(
      Object.entries(activity)
        .map(([date, scans]) => ({
          date,
          scans
        }))
        .reverse()
    );
  };

  const stats = (() => {
    const totalScans = history.length;
    const totalAmount = history.reduce((sum, item) => sum + item.total_amount, 0);
    const totalNotes = history.reduce(
      (sum, item) => sum + Object.values(item.counts).reduce((s, c) => s + c, 0),
      0
    );
    const avgAmountPerScan = totalScans > 0 ? Math.round(totalAmount / totalScans) : 0;

    return {
      totalScans,
      totalAmount,
      totalNotes,
      avgAmountPerScan
    };
  })();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs shadow-2xl glass-panel">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="font-semibold" style={{ color: entry.color || '#39ff14' }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Refresh */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-neon-blue glow-border-blue animate-pulse"></span>
            Scan Analytics
          </h2>
          <p className="text-neutral-400 mt-1">
            Advanced metrics, scan frequency, and currency distribution data.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neon-blue/30 text-neutral-400 hover:text-white rounded-lg transition-all duration-300 cursor-pointer"
        >
          <RefreshCw size={16} />
          Refresh Charts
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw size={36} className="animate-spin text-neon-blue" />
        </div>
      ) : history.length === 0 ? (
        <div className="min-h-[350px] rounded-2xl border border-neutral-800 flex flex-col items-center justify-center p-8 text-center bg-neutral-950/20 glass-panel">
          <BarChart3 size={48} className="text-neutral-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Data Available</h3>
          <p className="text-neutral-500 text-sm max-w-sm">
            Scan charts and distribution breakdowns will load once banknote entries are saved to the database.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl glass-panel border-neutral-800">
              <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                Total Scans
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                {stats.totalScans}
              </div>
            </div>

            <div className="p-5 rounded-xl glass-panel border-neutral-800">
              <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                Accumulated Amount
              </span>
              <div className="text-3xl font-extrabold text-neon-green glow-text-green mt-1 font-mono">
                ₹{stats.totalAmount.toLocaleString()}
              </div>
            </div>

            <div className="p-5 rounded-xl glass-panel border-neutral-800">
              <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                Banknotes Counted
              </span>
              <div className="text-3xl font-extrabold text-neon-blue glow-text-blue mt-1 font-mono">
                {stats.totalNotes}
              </div>
            </div>

            <div className="p-5 rounded-xl glass-panel border-neutral-800">
              <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                Avg Amount/Scan
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                ₹{stats.avgAmountPerScan.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Denomination Frequency Bar Chart */}
            <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-neon-green" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Denomination Frequency
                </h3>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={denomCountData}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                    <Bar dataKey="count" name="Notes Count" fill="#39ff14" radius={[4, 4, 0, 0]}>
                      {denomCountData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Total Value Share Pie Chart */}
            <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon size={18} className="text-neon-blue" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Total Value Share
                </h3>
              </div>
              <div className="h-72 w-full flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="h-full w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={denomValueData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {denomValueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-1/2 justify-center">
                  {denomValueData.map((entry, index) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-2.5 text-xs text-neutral-400 font-semibold px-2 py-1 rounded bg-neutral-900/60 border border-neutral-800"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></span>
                      <span>{entry.name}:</span>
                      <span className="text-white font-mono font-bold">
                        ₹{entry.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scan Activity Frequency Area Chart */}
          <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-950/20 glass-panel">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-purple-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Scan Activity Frequency
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="scans"
                    name="Daily Scans"
                    stroke="#00f0ff"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorScans)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}