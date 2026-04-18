import axios from 'axios';
import Cookie from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const TOKEN_KEY = 'ndn_token';

export const setAuthToken = (token: string) => {
  Cookie.set('jwt', token, { expires: 7 });
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearAuthToken = () => {
  Cookie.remove('jwt');
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const client = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = Cookie.get('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Pin {
  id: string;
  cid: string;
  name: string;
  size: number;
  status: 'pinned' | 'pinning' | 'failed' | 'queued';
  created: string;
  region?: string;
  replication?: number;
  encryption?: boolean;
  tier?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsed?: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  created: string;
}

export interface UsageSnapshot {
  date: string;
  bandwidth: number;
  requests: number;
  storage: number;
}

export interface Model {
  id: string;
  tenant_id: string;
  name: string;
  version: string;
  root_cid: string;
  shard_map: Record<string, string>;
  model_card: Record<string, unknown>;
  status: 'importing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export const api = {
  auth: {
    signup: (email: string, password: string, orgName?: string) =>
      client.post('/auth/signup', { email, password, orgName }),
    login: (email: string, password: string) =>
      client.post('/auth/login', { email, password }),
    siweNonce: () => client.post<{ nonce: string }>('/auth/siwe/nonce', {}),
    siweVerify: (message: string, signature: string) =>
      client.post<{ token: string }>('/auth/siwe/verify', { message, signature }),
  },
  pins: {
    list: (limit = 50, offset = 0) =>
      client.get(`/pins?limit=${limit}&offset=${offset}`),
    get: (cid: string) => client.get(`/pins/${cid}`),
    create: (formData: FormData) =>
      client.post('/pins', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (cid: string) => client.delete(`/pins/${cid}`),
  },
  apiKeys: {
    list: () => client.get('/auth/keys'),
    create: (name: string, scopes?: string[]) =>
      client.post('/auth/keys', { name, scopes }),
    revoke: (id: string) => client.delete(`/auth/keys/${id}`),
  },
  billing: {
    checkout: (plan: string) => client.post('/billing/checkout', { plan }),
  },
  analytics: {
    usage: (days = 30) => client.get(`/analytics/usage?days=${days}`),
    replicationHealth: () => client.get('/analytics/replication-health'),
  },
  models: {
    list: () => client.get<Model[]>('/models'),
    get: (name: string, version: string) =>
      client.get<Model>(`/models/${encodeURIComponent(name)}/${encodeURIComponent(version)}`),
    create: (body: {
      name: string;
      version: string;
      root_cid: string;
      shard_map?: Record<string, string>;
      model_card?: Record<string, unknown>;
    }) => client.post<Model>('/models', body),
  },
  health: {
    // Uses base axios instance (no /v1 prefix) for the root healthz endpoint.
    check: () => axios.get(`${API_URL}/healthz`).then((r) => r.data),
  },
  discovery: {
    get: () => client.get('/_discovery').then((r) => r.data),
  },
  records: {
    listCollections: () => client.get('/records/collections').then((r) => r.data),
    createCollection: (payload: { name: string; schema_cid?: string }) =>
      client.post('/records/collections', payload).then((r) => r.data),
    getCollection: (name: string) =>
      client.get(`/records/collections/${encodeURIComponent(name)}`).then((r) => r.data),
    put: (payload: { collection: string; id?: string; body: unknown; schema_cid?: string }) =>
      client.post('/records/', payload).then((r) => r.data),
    getByCid: (cid: string) =>
      client.get(`/records/${encodeURIComponent(cid)}`).then((r) => r.data),
    getHead: (collection: string, id: string) =>
      client
        .get(`/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`)
        .then((r) => r.data),
    history: (collection: string, id: string) =>
      client
        .get(`/records/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/history`)
        .then((r) => r.data),
    query: (
      name: string,
      params: {
        filter: unknown;
        projection?: unknown;
        sort?: unknown;
        limit?: number;
        cursor?: string;
      }
    ) =>
      client
        .post(`/records/collections/${encodeURIComponent(name)}/query`, params)
        .then((r) => r.data),
    views: {
      list: () => client.get('/records/views').then((r) => r.data),
      get: (name: string) =>
        client.get(`/records/views/${encodeURIComponent(name)}`).then((r) => r.data),
      create: (payload: {
        name: string;
        collection: string;
        filter: unknown;
        projection?: unknown;
        sort?: unknown;
        refresh?: string;
      }) => client.post('/records/views', payload).then((r) => r.data),
      getByCid: (cid: string) =>
        client.get(`/records/views/by-cid/${encodeURIComponent(cid)}`).then((r) => r.data),
    },
    schemas: {
      list: () => client.get('/records/schemas').then((r) => r.data),
      create: (payload: { name: string; schema: unknown; dialect?: string }) =>
        client.post('/records/schemas', payload).then((r) => r.data),
      get: (cid: string) =>
        client.get(`/records/schemas/${encodeURIComponent(cid)}`).then((r) => r.data),
    },
  },
};

export default client;
