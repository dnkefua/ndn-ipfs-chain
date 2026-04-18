export interface CurrentUser {
  email?: string;
  wallet?: string;
  tenant?: string;
}

/**
 * Decode the JWT stored in localStorage and return display-only user fields.
 * Does NOT verify the signature.
 */
export function getCurrentUser(): CurrentUser | null {
  try {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('ndn_token');
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 → decode
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));

    return {
      email: payload.email ?? undefined,
      wallet: payload.wallet ?? payload.address ?? undefined,
      tenant: payload.tenant ?? payload.tenantId ?? undefined,
    };
  } catch {
    return null;
  }
}
