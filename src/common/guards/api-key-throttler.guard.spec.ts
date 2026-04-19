import { ApiKeyThrottlerGuard } from './api-key-throttler.guard';

describe('ApiKeyThrottlerGuard', () => {
  const guard = new ApiKeyThrottlerGuard(
    {} as never,
    {} as never,
    {} as never,
  );
  const getTracker = (req: Record<string, unknown>) =>
    (
      guard as unknown as {
        getTracker: (r: Record<string, unknown>) => Promise<string>;
      }
    ).getTracker(req);

  it('uses the API key header when one is present', async () => {
    await expect(
      getTracker({ headers: { 'x-api-key': 'usr_abc' }, ip: '1.2.3.4' }),
    ).resolves.toBe('key:usr_abc');
  });

  it('falls back to the request IP when the API key header is missing', async () => {
    await expect(
      getTracker({ headers: {}, ip: '1.2.3.4' }),
    ).resolves.toBe('ip:1.2.3.4');
  });

  it('falls back to "unknown" when both the API key and IP are missing', async () => {
    await expect(getTracker({ headers: {} })).resolves.toBe('ip:unknown');
  });

  it('ignores a non-string API key header and falls back to IP', async () => {
    await expect(
      getTracker({ headers: { 'x-api-key': ['a', 'b'] }, ip: '5.6.7.8' }),
    ).resolves.toBe('ip:5.6.7.8');
  });

  it('ignores an empty API key header and falls back to IP', async () => {
    await expect(
      getTracker({ headers: { 'x-api-key': '' }, ip: '9.9.9.9' }),
    ).resolves.toBe('ip:9.9.9.9');
  });
});
