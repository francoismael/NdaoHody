import axios from 'axios';

describe('GET /api/health', () => {
  it('reports both databases as ok', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ postgres: 'ok', mongodb: 'ok' });
  });
});
