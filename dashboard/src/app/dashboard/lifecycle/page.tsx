'use client';

import { useState } from 'react';

interface Policy {
  id: string;
  name: string;
  rules: {
    fromTier: string;
    toTier: string;
    afterDays: number;
  }[];
  created_at: string;
  active: boolean;
}

const DEMO_POLICIES: Policy[] = [
  {
    id: '1',
    name: 'Standard Lifecycle',
    rules: [
      { fromTier: 'hot', toTier: 'warm', afterDays: 7 },
      { fromTier: 'warm', toTier: 'cold', afterDays: 90 },
      { fromTier: 'cold', toTier: 'glacier', afterDays: 365 },
    ],
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    active: true,
  },
  {
    id: '2',
    name: 'Quick Archive',
    rules: [
      { fromTier: 'hot', toTier: 'cold', afterDays: 30 },
    ],
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    active: false,
  },
];

const TIERS = ['hot', 'warm', 'cold', 'glacier'];

export default function LifecyclePage() {
  const [policies, setPolicies] = useState<Policy[]>(DEMO_POLICIES);
  const [showCreate, setShowCreate] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', rules: [{ fromTier: 'hot', toTier: 'warm', afterDays: 7 }] });

  const handleCreate = () => {
    if (!newPolicy.name) return;
    const policy: Policy = {
      id: Date.now().toString(),
      name: newPolicy.name,
      rules: newPolicy.rules,
      created_at: new Date().toISOString(),
      active: true,
    };
    setPolicies([policy, ...policies]);
    setShowCreate(false);
    setNewPolicy({ name: '', rules: [{ fromTier: 'hot', toTier: 'warm', afterDays: 7 }] });
  };

  const addRule = () => {
    const lastRule = newPolicy.rules[newPolicy.rules.length - 1];
    setNewPolicy({
      ...newPolicy,
      rules: [...newPolicy.rules, { fromTier: lastRule.toTier, toTier: TIERS[TIERS.indexOf(lastRule.toTier) + 1] || 'glacier', afterDays: 30 }],
    });
  };

  const updateRule = (index: number, field: string, value: string | number) => {
    const rules = [...newPolicy.rules];
    rules[index] = { ...rules[index], [field]: value };
    setNewPolicy({ ...newPolicy, rules });
  };

  const removeRule = (index: number) => {
    setNewPolicy({ ...newPolicy, rules: newPolicy.rules.filter((_, i) => i !== index) });
  };

  const togglePolicy = (id: string) => {
    setPolicies(p => p.map(pol => pol.id === id ? { ...pol, active: !pol.active } : pol));
  };

  const deletePolicy = (id: string) => {
    setPolicies(p => p.filter(pol => pol.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Storage Lifecycle</h2>
          <p className="text-slate-600 mt-2">Manage automatic tier transitions for pinned content</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium">Demo Mode</span>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Policy</button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Create Lifecycle Policy</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Policy Name</label>
            <input
              type="text"
              value={newPolicy.name}
              onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
              placeholder="e.g., Standard Archive"
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Transition Rules</label>
            {newPolicy.rules.map((rule, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <span>After</span>
                <input
                  type="number"
                  value={rule.afterDays}
                  onChange={(e) => updateRule(index, 'afterDays', parseInt(e.target.value))}
                  className="w-20"
                  min="1"
                />
                <span>days in</span>
                <select
                  value={rule.fromTier}
                  onChange={(e) => updateRule(index, 'fromTier', e.target.value)}
                  className="w-28"
                >
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span>move to</span>
                <select
                  value={rule.toTier}
                  onChange={(e) => updateRule(index, 'toTier', e.target.value)}
                  className="w-28"
                >
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {newPolicy.rules.length > 1 && (
                  <button onClick={() => removeRule(index)} className="text-red-600 hover:text-red-800 text-sm ml-auto">Remove</button>
                )}
              </div>
            ))}
            <button onClick={addRule} className="text-brand-600 hover:text-brand-700 text-sm">+ Add Rule</button>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="btn-primary">Create Policy</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Active Policies</h3>
        {policies.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No policies created yet.</div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policy.active}
                        onChange={() => togglePolicy(policy.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                    <div>
                      <h4 className="font-medium">{policy.name}</h4>
                      <div className="text-sm text-slate-500">Created {new Date(policy.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <button onClick={() => deletePolicy(policy.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {policy.rules.map((rule, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                      {rule.fromTier} → {rule.toTier} ({rule.afterDays}d)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Storage Tiers</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'Hot', desc: 'NVMe SSD, <7 days', price: '$0.0001/GB-day', color: 'bg-red-100 text-red-800' },
            { name: 'Warm', desc: 'SATA SSD, 7-90 days', price: '$0.00002/GB-day', color: 'bg-yellow-100 text-yellow-800' },
            { name: 'Cold', desc: 'Archive storage, 90+ days', price: '$0.000005/GB-day', color: 'bg-blue-100 text-blue-800' },
            { name: 'Glacier', desc: 'Deep archive, 365+ days', price: '$0.0000005/GB-day', color: 'bg-slate-100 text-slate-800' },
          ].map((tier) => (
            <div key={tier.name} className={`p-4 rounded-lg ${tier.color}`}>
              <h4 className="font-semibold">{tier.name}</h4>
              <p className="text-sm mt-1">{tier.desc}</p>
              <p className="text-sm font-medium mt-2">{tier.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
