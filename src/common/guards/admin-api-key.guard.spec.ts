import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminApiKeyGuard } from './admin-api-key.guard';

const makeContext = (header: string | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name.toLowerCase() === 'x-admin-key' ? header : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

const configWith = (adminApiKey: string | null): ConfigService =>
  ({
    getOrThrow: () => ({ adminApiKey }),
  }) as unknown as ConfigService;

describe('AdminApiKeyGuard', () => {
  it('allows the request when ADMIN_API_KEY is not configured', () => {
    const guard = new AdminApiKeyGuard(configWith(null));
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows the request when the provided admin key matches', () => {
    const guard = new AdminApiKeyGuard(configWith('secret'));
    expect(guard.canActivate(makeContext('secret'))).toBe(true);
  });

  it('throws UnauthorizedException when the admin key is missing', () => {
    const guard = new AdminApiKeyGuard(configWith('secret'));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the admin key does not match', () => {
    const guard = new AdminApiKeyGuard(configWith('secret'));
    expect(() => guard.canActivate(makeContext('wrong'))).toThrow(
      UnauthorizedException,
    );
  });
});
