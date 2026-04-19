import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CacheService } from './cache.service';

type MockRedis = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  quit: jest.Mock;
};

const makeClient = (): MockRedis => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
});

describe('CacheService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  describe('when the Redis client is null (disabled)', () => {
    const service = new CacheService(null);

    it('reports disabled', () => {
      expect(service.enabled).toBe(false);
    });

    it('get returns null without touching any client', async () => {
      await expect(service.get('key')).resolves.toBeNull();
    });

    it('set is a no-op', async () => {
      await expect(service.set('key', { v: 1 }, 60)).resolves.toBeUndefined();
    });

    it('del is a no-op', async () => {
      await expect(service.del('key')).resolves.toBeUndefined();
    });
  });

  describe('when the Redis client is connected', () => {
    let client: MockRedis;
    let service: CacheService;

    beforeEach(() => {
      client = makeClient();
      service = new CacheService(client as unknown as Redis);
    });

    it('reports enabled', () => {
      expect(service.enabled).toBe(true);
    });

    it('parses JSON on get when a value is present', async () => {
      client.get.mockResolvedValue(JSON.stringify({ v: 42 }));
      await expect(service.get<{ v: number }>('key')).resolves.toEqual({
        v: 42,
      });
    });

    it('returns null on a cache miss', async () => {
      client.get.mockResolvedValue(null);
      await expect(service.get('key')).resolves.toBeNull();
    });

    it('serializes and sets with EX TTL', async () => {
      client.set.mockResolvedValue('OK');
      await service.set('key', { v: 1 }, 60);
      expect(client.set).toHaveBeenCalledWith(
        'key',
        JSON.stringify({ v: 1 }),
        'EX',
        60,
      );
    });

    it('skips set when TTL is zero or negative', async () => {
      await service.set('key', { v: 1 }, 0);
      await service.set('key', { v: 1 }, -5);
      expect(client.set).not.toHaveBeenCalled();
    });

    it('swallows GET errors and returns null', async () => {
      client.get.mockRejectedValue(new Error('conn reset'));
      await expect(service.get('key')).resolves.toBeNull();
    });

    it('swallows SET errors', async () => {
      client.set.mockRejectedValue(new Error('conn reset'));
      await expect(service.set('key', 'v', 60)).resolves.toBeUndefined();
    });

    it('swallows DEL errors', async () => {
      client.del.mockRejectedValue(new Error('conn reset'));
      await expect(service.del('key')).resolves.toBeUndefined();
    });

    it('quits the client on module destroy', async () => {
      await service.onModuleDestroy();
      expect(client.quit).toHaveBeenCalled();
    });
  });
});
