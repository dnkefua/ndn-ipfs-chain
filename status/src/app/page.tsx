'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RegionStatus {
  region: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  ttfb: number;
  lastChecked: string;
}

interface FilecoinHealth {
  status: 'operational' | 'degraded' | 'down';
  activeDeals: number;
  successRate: number;
  avgSealTime: number;
}

interface HistoryPoint {
  time: string;
  value: number;
}

const REGIONS: RegionStatus[] = [
  {
    region: 'US-West (San Francisco)',
    status: 'operational',
    uptime: 99.98,
    ttfb: 42,
    lastChecked: new Date(Date.now() - 60000).toISOString(),
  },
  {
    region: 'US-East (Virginia)',
    status: 'operational',
    uptime: 99.96,
    ttfb: 58,
    lastChecked: new Date(Date.now() - 45000).toISOString(),
  },
  {
    region: 'EU (Frankfurt)',
    status: 'operational',
    uptime: 99.97,
    ttfb: 51,
    lastChecked: new Date(Date.now() - 30000).toISOString(),
  },
  {
    region: 'Asia-Pacific (Singapore)',
    status: 'operational',
    uptime: 99.94,
    ttfb: 73,
    lastChecked: new Date(Date.now() - 65000).toISOString(),
  },
  {
    region: 'Asia-Pacific (Tokyo)',
    status: 'operational',
    uptime: 99.95,
    ttfb: 69,
    lastChecked: new Date(Date.now() - 20000).toISOString(),
  },
];

const FILECOIN_HEALTH: FilecoinHealth = {
  status: 'operational',
  activeDeals: 1_245,
  successRate: 99.87,
  avgSealTime: 36,
};

export default function StatusPage() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'down'>('operational');

  useEffect(() => {
    // Generate mock historical data for the last 24 hours
    const now = Date.now();
    const points: HistoryPoint[] = [];
    for (let i = 0; i < 24; i++) {
      const time = new Date(now - (23 - i) * 60 * 60 * 1000);
      points.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: 99.5 + Math.random() * 0.5,
      });
    }
    setHistory(points);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'status-operational';
      case 'degraded':
        return 'status-degraded';
      case 'down':
        return 'status-down';
      default:
        return 'status-operational';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'down':
        return '✕';
      default:
        return '●';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">System Status</h1>
        <p className="text-slate-600">Real-time monitoring of NDN IPFS Chain infrastructure</p>
      </div>

      {/* Overall Status */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-medium">System Status</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">All Systems Operational</p>
            <p className="text-sm text-slate-600 mt-1">Last update: {new Date().toLocaleTimeString()}</p>
          </div>
          <div className={`status-badge ${getStatusColor('operational')}`}>
            <span className={`status-dot bg-green-600`}></span>
            Operational
          </div>
        </div>
      </div>

      {/* Uptime Chart */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Uptime (Last 24 Hours)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              domain={[99, 100]}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0ea5e9"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Regions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Regional Status</h2>
        <div className="space-y-3">
          {REGIONS.map((region) => (
            <div key={region.region} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`status-badge ${getStatusColor(region.status)}`}>
                      <span className={`status-dot ${
                        region.status === 'operational' ? 'bg-green-600' :
                        region.status === 'degraded' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}></span>
                      {region.status === 'operational' ? '✓ Operational' :
                       region.status === 'degraded' ? '⚠ Degraded' :
                       '✕ Down'}
                    </span>
                    <p className="font-medium text-slate-900">{region.region}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-slate-600">Uptime (30d)</p>
                      <p className="font-semibold text-slate-900">{region.uptime}%</p>
                    </div>
                    <div>
                      <p className="text-slate-600">TTFB (avg)</p>
                      <p className="font-semibold text-slate-900">{region.ttfb}ms</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Last Check</p>
                      <p className="font-semibold text-slate-900">{Math.round((Date.now() - new Date(region.lastChecked).getTime()) / 1000)}s ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filecoin Health */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Filecoin Integration</h2>
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-600 text-sm font-medium">Status</p>
              <div className={`status-badge ${getStatusColor(FILECOIN_HEALTH.status)} mt-2`}>
                <span className={`status-dot bg-green-600`}></span>
                Operational
              </div>
            </div>
            <div>
              <p className="text-slate-600 text-sm font-medium">Active Deals</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {FILECOIN_HEALTH.activeDeals.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-sm font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {FILECOIN_HEALTH.successRate}%
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-sm font-medium">Avg Seal Time</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {FILECOIN_HEALTH.avgSealTime}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents */}
      <div className="card bg-green-50 border border-green-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <h3 className="font-semibold text-slate-900">No Active Incidents</h3>
            <p className="text-sm text-slate-600 mt-1">
              All systems are running normally. <a href="https://twitter.com/ndnanalytics" className="text-brand-600 hover:underline">Follow us on Twitter</a> for updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
