'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api, UsageSnapshot } from '@/lib/api';

export default function AnalyticsPage() {
  const [usage, setUsage] = useState<UsageSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalBandwidth: 0,
    totalRequests: 0,
    totalStorage: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.analytics.usage(30);
      const data = response.data || [];
      setUsage(data);

      const totalBandwidth = data.reduce((sum: number, d: UsageSnapshot) => sum + (d.bandwidth || 0), 0);
      const totalRequests = data.reduce((sum: number, d: UsageSnapshot) => sum + (d.requests || 0), 0);
      const totalStorage = data.length > 0 ? data[data.length - 1].storage || 0 : 0;

      setStats({ totalBandwidth, totalRequests, totalStorage });
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-600 mt-2">View your usage and performance metrics</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-800">
          {error}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-slate-600 text-sm font-medium">Total Bandwidth (30d)</p>
            <p className="text-3xl font-bold text-brand-600 mt-2">
              {formatBytes(stats.totalBandwidth)}
            </p>
          </div>
          <div className="card">
            <p className="text-slate-600 text-sm font-medium">Total Requests (30d)</p>
            <p className="text-3xl font-bold text-brand-600 mt-2">
              {stats.totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="card">
            <p className="text-slate-600 text-sm font-medium">Current Storage</p>
            <p className="text-3xl font-bold text-brand-600 mt-2">
              {formatBytes(stats.totalStorage)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12 text-slate-600">Loading analytics...</div>
      ) : usage.length === 0 ? (
        <div className="card text-center py-12 text-slate-600">
          No usage data yet. Start uploading content to see metrics.
        </div>
      ) : (
        <>
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Bandwidth Usage (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => formatBytes(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
                <Line
                  type="monotone"
                  dataKey="bandwidth"
                  stroke="#0ea5e9"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Request Volume (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
                <Bar dataKey="requests" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
