import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET request calls fetch with correct URL', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockData), { status: 200 })
    );

    const result = await api.get('/tasks');
    expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    expect(result).toEqual(mockData);
  });

  it('POST request sends JSON body', async () => {
    const body = { name: 'New Task' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '1', ...body }), { status: 201 })
    );

    await api.post('/tasks', body);
    expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(body),
    }));
  });

  it('PUT request sends JSON body', async () => {
    const body = { name: 'Updated' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '1', ...body }), { status: 200 })
    );

    await api.put('/tasks/1', body);
    expect(fetch).toHaveBeenCalledWith('/api/tasks/1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify(body),
    }));
  });

  it('DELETE request uses DELETE method', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    );

    await api.delete('/tasks/1');
    expect(fetch).toHaveBeenCalledWith('/api/tasks/1', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    );

    const result = await api.delete('/tasks/1');
    expect(result).toBeUndefined();
  });

  it('throws error data for non-ok responses', async () => {
    const errorData = { error: { code: 'NOT_FOUND', message: 'Not found' } };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(errorData), { status: 404 })
    );

    await expect(api.get('/tasks/999')).rejects.toEqual(errorData);
  });
});
