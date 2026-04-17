'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Get started with IPFS',
    features: [
      '100 GB/month storage',
      'Community support',
      '1 API key',
      'Web dashboard',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    description: 'For individual creators',
    features: [
      '1 TB/month storage',
      'Email support',
      'Unlimited API keys',
      'Analytics dashboard',
      'Encryption at rest',
      'API rate limit 1K/min',
    ],
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: '$199',
    description: 'For organizations',
    features: [
      '50 TB/month storage',
      '24/7 priority support',
      'Team management',
      'Advanced analytics',
      'Custom region selection',
      'API rate limit 10K/min',
      'SLA guarantee',
    ],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async (plan: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.billing.checkout(plan);
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Billing & Plans</h2>
        <p className="text-slate-600 mt-2">Choose the right plan for your needs</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card ${plan.highlighted ? 'border-2 border-brand-600 transform scale-105' : ''}`}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-slate-600 text-sm mt-1">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                {plan.id !== 'free' && (
                  <span className="text-slate-600 ml-2">/month</span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading || plan.id === 'free'}
              className={`w-full py-3 rounded-lg font-medium transition-colors mb-6 ${
                plan.id === 'free'
                  ? 'bg-slate-200 text-slate-700 cursor-default'
                  : plan.highlighted
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
            >
              {loading ? 'Processing...' : plan.id === 'free' ? 'Current Plan' : 'Upgrade'}
            </button>

            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="text-brand-600 font-bold mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card bg-slate-100">
        <h3 className="font-semibold text-lg mb-4">Payment Methods</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">💳 Credit Card</p>
              <p className="text-sm text-slate-600">Visa, Mastercard, Amex</p>
            </div>
            <span className="text-green-600 font-medium">✓ Available</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">🪙 USDC Crypto</p>
              <p className="text-sm text-slate-600">Base, Arbitrum, Polygon (2% discount)</p>
            </div>
            <span className="text-green-600 font-medium">✓ Available</span>
          </div>
        </div>
      </div>

      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-lg mb-2">💡 Enterprise Plans</h3>
        <p className="text-sm text-slate-700 mb-4">
          Need custom storage, SLA, or dedicated support? <a href="mailto:sales@ndnanalytics.com" className="text-brand-600 hover:underline">Contact our sales team</a>
        </p>
      </div>
    </div>
  );
}
