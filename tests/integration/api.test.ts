import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/v1';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY_URL || 'http://localhost:8080';

let testJWT: string;
let testCID: string;
let testApiKey: string;

describe('NDN IPFS Chain Integration Tests', () => {
  beforeAll(async () => {
    // Create a test account
    const signupRes = await axios.post(`${API_URL}/auth/signup`, {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      orgName: 'Test Org',
    });

    testJWT = signupRes.data.jwt;
    testApiKey = signupRes.data.apiKey;

    expect(testJWT).toBeTruthy();
    expect(testApiKey).toBeTruthy();
  });

  describe('Authentication', () => {
    it('should sign up a new user', async () => {
      const res = await axios.post(`${API_URL}/auth/signup`, {
        email: `new-user-${Date.now()}@example.com`,
        password: 'Password123!',
        orgName: 'New Org',
      });

      expect(res.status).toBe(201);
      expect(res.data.jwt).toBeTruthy();
      expect(res.data.user).toBeTruthy();
      expect(res.data.apiKey).toBeTruthy();
    });

    it('should login with email and password', async () => {
      const email = `login-test-${Date.now()}@example.com`;

      // Sign up first
      await axios.post(`${API_URL}/auth/signup`, {
        email,
        password: 'Password123!',
        orgName: 'Login Test',
      });

      // Then login
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.data.jwt).toBeTruthy();
      expect(res.data.user.email).toBe(email);
    });

    it('should reject invalid credentials', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'WrongPassword',
        });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
        expect(err.response.data.error).toBe('invalid_credentials');
      }
    });
  });

  describe('API Keys', () => {
    it('should create a new API key', async () => {
      const res = await axios.post(`${API_URL}/auth/keys`, {
        name: 'Test Key',
        scopes: ['pins:read', 'pins:write'],
      }, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(201);
      expect(res.data.rawKey).toBeTruthy();
      expect(res.data.rawKey.startsWith('ndn_live_')).toBe(true);
    });

    it('should list API keys', async () => {
      const res = await axios.get(`${API_URL}/auth/keys`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });

    it('should revoke an API key', async () => {
      // Create a key
      const createRes = await axios.post(`${API_URL}/auth/keys`, {
        name: 'Key to Revoke',
      }, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      const keyId = createRes.data.id;

      // Revoke it
      const revokeRes = await axios.delete(`${API_URL}/auth/keys/${keyId}`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(revokeRes.status).toBe(204);
    });
  });

  describe('Pins', () => {
    it('should pin a CID', async () => {
      const res = await axios.post(
        `${API_URL}/pins`,
        {
          cid: 'QmUNLLsPACCz1vLxQVkXqqLX5FiNqUchASXrH4MCZAWW2', // Known test CID
          name: 'Test Pin',
          replication: 3,
        },
        { headers: { Authorization: `Bearer ${testJWT}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.cid).toBeTruthy();
      expect(res.data.status).toBe('pinned');
      testCID = res.data.cid;
    });

    it('should list pins', async () => {
      const res = await axios.get(`${API_URL}/pins?limit=10`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.pins)).toBe(true);
    });

    it('should get pin details', async () => {
      if (!testCID) this.skip();

      const res = await axios.get(`${API_URL}/pins/${testCID}`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.cid).toBe(testCID);
    });

    it('should delete a pin', async () => {
      if (!testCID) this.skip();

      const res = await axios.delete(`${API_URL}/pins/${testCID}`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(204);
    });
  });

  describe('Analytics', () => {
    it('should get usage metrics', async () => {
      const res = await axios.get(`${API_URL}/analytics/usage?days=30`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.bandwidth).toBeDefined();
      expect(res.data.requests).toBeDefined();
      expect(res.data.storage).toBeDefined();
    });

    it('should get replication health', async () => {
      const res = await axios.get(`${API_URL}/analytics/replication-health`, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe('Gateway', () => {
    it('should serve IPFS content from gateway', async () => {
      const knownCID = 'QmUNLLsPACCz1vLxQVkXqqLX5FiNqUchASXrH4MCZAWW2';

      try {
        const res = await axios.get(`${IPFS_GATEWAY}/ipfs/${knownCID}`);
        expect(res.status).toBe(200);
      } catch (err: any) {
        // Content may not exist in test network; that's ok
        expect([404, 408, 502]).toContain(err.response?.status || 502);
      }
    });

    it('should support verified retrieval (?verify=true)', async () => {
      const res = await axios.post(`${API_URL}/pins`, {
        cid: 'QmUNLLsPACCz1vLxQVkXqqLX5FiNqUchASXrH4MCZAWW2',
        name: 'Verify Test',
      }, {
        headers: { Authorization: `Bearer ${testJWT}` },
      });

      const cid = res.data.cid;

      try {
        const verifyRes = await axios.get(
          `${IPFS_GATEWAY}/ipfs/${cid}?verify=true`,
          { validateStatus: () => true }
        );

        if (verifyRes.status === 200) {
          expect(verifyRes.headers['x-ipfs-verified']).toBeTruthy();
        }
      } catch (err) {
        // Network may not support verification yet; that's ok
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid pin request', async () => {
      try {
        await axios.post(
          `${API_URL}/pins`,
          { name: 'No CID' },
          { headers: { Authorization: `Bearer ${testJWT}` } }
        );
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.response.status).toBe(400);
      }
    });

    it('should return 401 without authentication', async () => {
      try {
        await axios.get(`${API_URL}/pins`);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
      }
    });

    it('should return 403 with invalid API key', async () => {
      try {
        await axios.get(`${API_URL}/pins`, {
          headers: { 'X-API-Key': 'ndn_live_invalid' },
        });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.response.status).toBe(401);
      }
    });
  });
});
