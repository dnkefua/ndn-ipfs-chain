'use client';

import { useEffect, useState } from 'react';
import { api, ApiKey } from '@/lib/api';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showRawKey, setShowRawKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await api.apiKeys.list();
      setKeys(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const response = await api.apiKeys.create(newKeyName);
      setShowRawKey(response.data.rawKey);
      setNewKeyName('');
      setTimeout(() => loadKeys(), 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create API key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Revoke this API key? It cannot be undone.')) return;
    try {
      await api.apiKeys.revoke(id);
      await loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke API key');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">API Keys</h2>
        <p className="text-slate-600 mt-2">Create and manage your API credentials</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-800">
          {error}
        </div>
      )}

      {showRawKey && (
        <div className="p-4 rounded-lg bg-green-100 border border-green-300">
          <p className="text-sm font-medium text-green-900 mb-2">🔐 Save your key now—you won't see it again:</p>
          <code className="block bg-white p-3 rounded border border-green-300 font-mono text-sm break-all text-green-800 mb-3">
            {showRawKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(showRawKey);
              setShowRawKey(null);
            }}
            className="btn-primary text-sm"
          >
            ✓ Copied & Understood
          </button>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Create New Key</h3>
        <form onSubmit={handleCreateKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Key Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., 'Production Cluster'"
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Generate API Key
          </button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Active Keys</h3>
          <span className="text-sm bg-slate-200 px-3 py-1 rounded-full">
            {keys.length} keys
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-600">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-slate-600">No API keys yet. Create one above.</div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{key.name}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Scopes: {key.scopes.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
