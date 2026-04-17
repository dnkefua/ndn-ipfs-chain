'use client';

import { useState } from 'react';

interface Trigger {
  id: string;
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'solana';
  contract: string;
  event: string;
  cid_field: string;
  enabled: boolean;
  last_block: number;
  created_at: string;
}

const DEMO_TRIGGERS: Trigger[] = [
  { id: '1', chain: 'ethereum', contract: '0x1234...', event: 'Transfer', cid_field: 'tokenURI', enabled: true, last_block: 19234567, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', chain: 'polygon', contract: '0x5678...', event: 'Mint', cid_field: 'contentHash', enabled: true, last_block: 54321000, created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', chain: 'base', contract: '0x9abc...', event: 'Created', cid_field: 'data', enabled: false, last_block: 12345678, created_at: new Date(Date.now() - 259200000).toISOString() },
];

const CHAINS = ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'solana'];

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>(DEMO_TRIGGERS);
  const [showCreate, setShowCreate] = useState(false);
  const [newTrigger, setNewTrigger] = useState({ chain: 'ethereum', contract: '', event: '', cid_field: '' });

  const handleCreate = () => {
    if (!newTrigger.contract || !newTrigger.event) return;
    const trigger: Trigger = {
      id: Date.now().toString(),
      chain: newTrigger.chain as Trigger['chain'],
      contract: newTrigger.contract,
      event: newTrigger.event,
      cid_field: newTrigger.cid_field,
      enabled: true,
      last_block: 0,
      created_at: new Date().toISOString(),
    };
    setTriggers([trigger, ...triggers]);
    setShowCreate(false);
    setNewTrigger({ chain: 'ethereum', contract: '', event: '', cid_field: '' });
  };

  const toggleTrigger = (id: string) => {
    setTriggers(t => t.map(trig => trig.id === id ? { ...trig, enabled: !trig.enabled } : trig));
  };

  const deleteTrigger = (id: string) => {
    setTriggers(t => t.filter(trig => trig.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Smart Contract Triggers</h2>
          <p className="text-slate-600 mt-2">Auto-pin content when blockchain events occur</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium">Demo Mode</span>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Trigger</button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Create New Trigger</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chain</label>
              <select
                value={newTrigger.chain}
                onChange={(e) => setNewTrigger({ ...newTrigger, chain: e.target.value })}
                className="w-full"
              >
                {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contract Address</label>
              <input
                type="text"
                value={newTrigger.contract}
                onChange={(e) => setNewTrigger({ ...newTrigger, contract: e.target.value })}
                placeholder="0x..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Event Name</label>
              <input
                type="text"
                value={newTrigger.event}
                onChange={(e) => setNewTrigger({ ...newTrigger, event: e.target.value })}
                placeholder="e.g., Transfer"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CID Field in Event</label>
              <input
                type="text"
                value={newTrigger.cid_field}
                onChange={(e) => setNewTrigger({ ...newTrigger, cid_field: e.target.value })}
                placeholder="e.g., tokenURI"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="btn-primary">Create Trigger</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Active Triggers</h3>
        {triggers.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No triggers configured.</div>
        ) : (
          <div className="space-y-3">
            {triggers.map((trigger) => (
              <div key={trigger.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trigger.event}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{trigger.chain}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Contract: <code className="bg-slate-100 px-1 rounded">{trigger.contract}</code>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Last block: {trigger.last_block.toLocaleString()} | CID field: {trigger.cid_field}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trigger.enabled}
                      onChange={() => toggleTrigger(trigger.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                  <button onClick={() => deleteTrigger(trigger.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
