import { describe, it, expect, beforeAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = 'test-key';

let api: AxiosInstance;

describe('NDN IPFS Chain - Integration Tests', () => {
  beforeAll(() => {
    api = axios.create({
      baseURL: `${API_BASE_URL}/v1`,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });
  });

  describe('Health Checks', () => {
    it('should respond to health check', async () => {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        validateStatus: () => true,
      });
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('API Endpoints', () => {
    it('should list pins', async () => {
      const response = await api.get('/pins');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('pins');
    });

    it('should support limit parameter', async () => {
      const response = await api.get('/pins?limit=10');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.pins)).toBe(true);
    });

    it('should get usage analytics', async () => {
      const response = await api.get('/analytics/usage');
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for missing API key', async () => {
      const noAuthApi = axios.create({
        baseURL: `${API_BASE_URL}/v1`,
        validateStatus: () => true,
      });

      const response = await noAuthApi.get('/pins');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request', async () => {
      const response = await api.post('/pins', {});
      expect(response.status).toBe(400);
    });
  });

  describe('Pin Operations', () => {
    it('should handle pin CID requests', async () => {
      const response = await api.post('/pins', {
        cid: 'QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        name: 'test-pin',
      });

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle get pin details', async () => {
      const response = await api.get('/pins/QmTest123', {
        validateStatus: () => true,
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should list pins in < 500ms', async () => {
      const start = Date.now();
      await api.get('/pins?limit=10');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});
