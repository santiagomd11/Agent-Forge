import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimeAgo } from '../useTimeAgo';

describe('useTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than 60 seconds ago', () => {
    expect(useTimeAgo('2026-03-06T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago for timestamps less than 1 hour ago', () => {
    expect(useTimeAgo('2026-03-06T11:55:00Z')).toBe('5m ago');
    expect(useTimeAgo('2026-03-06T11:30:00Z')).toBe('30m ago');
  });

  it('returns hours ago for timestamps less than 1 day ago', () => {
    expect(useTimeAgo('2026-03-06T09:00:00Z')).toBe('3h ago');
    expect(useTimeAgo('2026-03-05T13:00:00Z')).toBe('23h ago');
  });

  it('returns days ago for timestamps less than 1 week ago', () => {
    expect(useTimeAgo('2026-03-04T12:00:00Z')).toBe('2d ago');
    expect(useTimeAgo('2026-03-01T12:00:00Z')).toBe('5d ago');
  });

  it('returns formatted date for timestamps older than 1 week', () => {
    const result = useTimeAgo('2026-02-01T12:00:00Z');
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});
