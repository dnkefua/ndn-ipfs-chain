'use client';

import { useState } from 'react';

interface RegionStatus {
  name: string;
  region: string;
  uptime: number;
  ttfb: number;
  status: 'healthy' | 'degraded' | 'down';
  pins: number;
}

const DEMO_STATUS: RegionStatus[] = [
  { name: 'US West', region: 'us-west-1', uptime: 99.99, ttfb: 45, status: 'healthy', pins: 1245000 },
  { name: 'US East', region: 'us-east-1', uptime: 99.98, ttfb: 52, status: 'healthy', pins: 980000 },
  { name: 'EU Central', region: 'eu-central-1', uptime: 99.99, ttfb: 78, status: 'healthy', pins: 1560000 },
  { name: 'Asia Pacific', region: 'ap-southeast-1', uptime: 99.95, ttfb: 120, status: 'degraded', pins: 450000 },
  { name: 'Asia Northeast', region: 'ap-northeast-1', uptime: 99.97, ttfb: 95, status: 'healthy', pins: 620000 },
  { name: 'South America', region: 'sa-east-1', uptime: 99.90, ttfb: 150, status: 'healthy', pins: 180000 },
  { name: 'Middle East', region: 'me-central-1', uptime: 99.85, ttfb: 180, status: 'degraded', pins: 95000 },
];

export default function StatusPage() {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const overallUptime = (DEMO_STATUS.reduce((sum, r) => sum + r.uptime, 0) / DEMO_STATUS.length).toFixed(2);
  const totalPins = DEMO_STATUS.reduce((sum, r) => sum + r.pins, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Infrastructure Status</h2>
          <p className="text-slate-600 mt-2">Real-time monitoring across all regions</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium">Demo Mode</span>
          <span className="text-sm text-slate-500">Last updated: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-slate-600">Overall Uptime</div>
          <div className="text-3xl font-bold text-green-600">{overallUptime}%</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Total Pins</div>
          <div className="text-3xl font-bold text-brand-600">{(totalPins / 1000000).toFixed(1)}M</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Avg TTFB</div>
          <div className="text-3xl font-bold text-brand-600">94ms</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-600">Regions</div>
          <div className="text-3xl font-bold text-brand-600">7</div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Regional Status</h3>
        <div className="space-y-3">
          {DEMO_STATUS.map((region) => (
            <div key={region.region} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  region.status === 'healthy' ? 'bg-green-500' :
                  region.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <div className="font-medium">{region.name}</div>
                  <div className="text-sm text-slate-500">{region.region}</div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-sm text-slate-500">Uptime</div>
                  <div className={`font-semibold ${region.uptime >= 99.9 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {region.uptime}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500">TTFB</div>
                  <div className={`font-semibold ${region.ttfb < 100 ? 'text-green-600' : region.ttfb < 150 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {region.ttfb}ms
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500">Pins</div>
                  <div className="font-semibold">{(region.pins / 1000).toFixed(0)}K</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500">Status</div>
                  <span className={`badge ${
                    region.status === 'healthy' ? 'badge-success' :
                    region.status === 'degraded' ? 'badge-warning' : 'badge-error'
                  }`}>
                    {region.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Filecoin Integration</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-slate-600">Active Deals</div>
            <div className="text-2xl font-bold text-green-600">12,847</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-slate-600">Total Data Stored</div>
            <div className="text-2xl font-bold text-blue-600">847 GiB</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-slate-600">Verified Deals</div>
            <div className="text-2xl font-bold text-purple-600">8,234</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-slate-600">Renewal Rate</div>
            <div className="text-2xl font-bold text-orange-600">94.2%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
