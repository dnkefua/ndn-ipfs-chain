'use client';

import { useEffect, useState } from 'react';
import { api, Pin } from '@/lib/api';

const DEMO_PINS: Pin[] = [
  { id: '1', cid: 'bafybeigdyrzt5srpe6v2mx5fxv5fdy56kw7btqyh2yeqv5v55c2c6m3q', name: 'sample-document.pdf', size: 1024000, status: 'pinned', created: new Date().toISOString(), region: 'us-west-1', encryption: false, tier: 'hot' },
  { id: '2', cid: 'bafybeihkoviema7g3gxyt6la7vb5q4cs7sqm4z5f2p7hwgy3x3pxsj3uy', name: 'product-image.jpg', size: 512000, status: 'pinned', created: new Date(Date.now() - 86400000).toISOString(), region: 'eu-central-1', encryption: true, tier: 'warm' },
  { id: '3', cid: 'bafybeif7ztnhq65lumvvtr4xsazvxc7re257jwv4knd7fjlid6ar7e3uy', name: 'dataset.csv', size: 10485760, status: 'pinned', created: new Date(Date.now() - 172800000).toISOString(), region: 'us-east-1', encryption: false, tier: 'cold' },
];

export default function PinsPage() {
  const [pins, setPins] = useState<Pin[]>(DEMO_PINS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPins();
  }, []);

  const loadPins = async () => {
    try {
      setLoading(true);
      const response = await api.pins.list(100, 0);
      if (response.data?.pins?.length > 0) {
        setPins(response.data.pins);
      }
    } catch {
      // Use demo data on error
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('encryption', 'false');

      await api.pins.create(formData);
      await loadPins();
      e.target.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (cid: string) => {
    if (!confirm('Delete this pin?')) return;
    try {
      await api.pins.delete(cid);
      await loadPins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Pinned Content</h2>
          <p className="text-slate-600 mt-2">Manage your IPFS pins and content lifecycle</p>
        </div>
        <span className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium">Demo Mode</span>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-800">
          {error}
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Upload New Content</h3>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-brand-400 transition-colors cursor-pointer">
          <div className="text-4xl mb-3">📁</div>
          <p className="font-medium text-slate-900">Demo Mode - Upload Disabled</p>
          <p className="text-sm text-slate-600 mt-1">Connect API for real uploads</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Your Pins</h3>
          <span className="text-sm bg-slate-200 px-3 py-1 rounded-full">
            {pins.length} items
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading pins...</div>
        ) : pins.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No pins yet. Upload a file to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-300 bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">CID</th>
                  <th className="text-left px-4 py-3 font-medium">Size</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((pin) => (
                  <tr key={pin.cid} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 max-w-xs truncate">{pin.name || 'Unnamed'}</td>
                    <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">{pin.cid}</td>
                    <td className="px-4 py-3">
                      {pin.size ? `${(pin.size / 1024 / 1024).toFixed(2)} MB` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        pin.status === 'pinned' ? 'badge-success' :
                        pin.status === 'pinning' ? 'badge-warning' :
                        'badge-error'
                      }`}>
                        {pin.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(pin.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(pin.cid)}
                        className="text-red-600 hover:text-red-800 font-medium text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
