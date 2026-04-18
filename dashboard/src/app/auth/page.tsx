'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api';

/* ---------- tiny inline toast (no context required on the auth page) ---------- */
interface InlineToast {
  message: string;
  variant: 'error' | 'success' | 'warning';
}

function Toast({ toast, onClose }: { toast: InlineToast; onClose: () => void }) {
  const bg =
    toast.variant === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : toast.variant === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-yellow-50 border-yellow-200 text-yellow-800';
  return (
    <div className={`flex items-start gap-2 p-3 rounded border text-sm ${bg}`}>
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
        &times;
      </button>
    </div>
  );
}

/* ---------- helpers ---------- */
function extractToken(data: Record<string, unknown>): string | null {
  return (
    (data.token as string | undefined) ??
    (data.jwt as string | undefined) ??
    (data.accessToken as string | undefined) ??
    null
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

/* ---------- component ---------- */
export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [siweLoading, setSiweLoading] = useState(false);
  const [inlineToast, setInlineToast] = useState<InlineToast | null>(null);

  function showToast(message: string, variant: InlineToast['variant'] = 'error') {
    setInlineToast({ message, variant });
  }

  /* ---- Email / password submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up
        const signupRes = await api.auth.signup(email, password, orgName);
        const signupData = signupRes.data as Record<string, unknown>;
        const signupToken = extractToken(signupData);

        if (signupToken) {
          setAuthToken(signupToken);
          router.push('/dashboard');
          return;
        }

        // No token returned — auto-login
        const loginRes = await api.auth.login(email, password);
        const loginData = loginRes.data as Record<string, unknown>;
        const loginToken = extractToken(loginData);
        if (!loginToken) throw new Error('No token returned after signup.');
        setAuthToken(loginToken);
        router.push('/dashboard');
      } else {
        // Login
        const res = await api.auth.login(email, password);
        const data = res.data as Record<string, unknown>;
        const token = extractToken(data);
        if (!token) throw new Error('No token returned.');
        setAuthToken(token);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.error ??
        axiosErr?.message ??
        'Authentication failed. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ---- SIWE ---- */
  const handleSiwe = async () => {
    setError('');
    setSiweLoading(true);

    try {
      if (typeof window.ethereum === 'undefined') {
        showToast(
          'No Ethereum wallet detected. Install MetaMask to continue.',
          'warning'
        );
        setSiweLoading(false);
        return;
      }

      // Dynamic import to avoid SSR issues
      const { ethers } = await import('ethers');
      const { SiweMessage } = await import('siwe');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const nonceRes = await api.auth.siweNonce();
      const nonce = (nonceRes.data as { nonce: string }).nonce;

      const msg = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to NDN IPFS Chain with your Ethereum wallet.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = msg.prepareMessage();

      let signature: string;
      try {
        signature = await signer.signMessage(prepared);
      } catch (sigErr: unknown) {
        const e = sigErr as { code?: string | number; message?: string };
        if (
          e?.code === 4001 ||
          e?.code === 'ACTION_REJECTED' ||
          String(e?.code) === '4001'
        ) {
          showToast('Signature request rejected. Please approve the MetaMask prompt to sign in.', 'warning');
          return;
        }
        throw sigErr;
      }

      const verifyRes = await api.auth.siweVerify(prepared, signature);
      const verifyData = verifyRes.data as Record<string, unknown>;
      const token = extractToken(verifyData);

      if (!token) throw new Error('No token returned from SIWE verification.');
      setAuthToken(token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } };
        message?: string;
        code?: string | number;
      };

      if (axiosErr?.response?.status === 401) {
        showToast('Wallet verification failed. Please try again.', 'error');
      } else if (!axiosErr?.response && axiosErr?.message) {
        showToast(`Network error: ${axiosErr.message}`, 'error');
      } else {
        showToast(
          axiosErr?.response?.data?.error ?? axiosErr?.message ?? 'SIWE sign-in failed.',
          'error'
        );
      }
    } finally {
      setSiweLoading(false);
    }
  };

  /* ---- render ---- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md card bg-white shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">NDN IPFS Chain</h1>
          <p className="text-slate-600 mt-2">Enterprise IPFS Pinning</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => { setMode('login'); setError(''); setInlineToast(null); }}
            className={`flex-1 py-3 font-medium transition-colors ${
              mode === 'login'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setInlineToast(null); }}
            className={`flex-1 py-3 font-medium transition-colors ${
              mode === 'signup'
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Inline toast */}
        {inlineToast && (
          <div className="mb-4">
            <Toast toast={inlineToast} onClose={() => setInlineToast(null)} />
          </div>
        )}

        {/* Inline error */}
        {error && !inlineToast && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your organization"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-slate-200" />
          <span className="text-sm text-slate-500">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* SIWE button */}
        <button
          type="button"
          onClick={handleSiwe}
          disabled={siweLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {siweLoading ? (
            <span>Connecting wallet...</span>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M7 14l3-6 2 4 2-3 3 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Sign in with Ethereum</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
