import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { UserService } from '../../modules/user/user.service';
import { User } from '../../modules/user/user.entity';

const makeContext = (header: string | undefined) => {
  const request: { user?: User; header: (name: string) => string | undefined } =
    {
      header: (name: string) =>
        name.toLowerCase() === 'x-api-key' ? header : undefined,
    };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    __request: request,
  } as unknown as ExecutionContext & { __request: typeof request };
};

describe('ApiKeyGuard', () => {
  it('attaches the user to the request when the API key matches', async () => {
    const user = { id: 'u1' } as User;
    const userService = {
      findByApiKey: jest.fn().mockResolvedValue(user),
    } as unknown as UserService;

    const guard = new ApiKeyGuard(userService);
    const ctx = makeContext('usr_valid');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(userService.findByApiKey).toHaveBeenCalledWith('usr_valid');
    expect((ctx as unknown as { __request: { user?: User } }).__request.user).toBe(user);
  });

  it('throws UnauthorizedException when the header is missing', async () => {
    const userService = { findByApiKey: jest.fn() } as unknown as UserService;
    const guard = new ApiKeyGuard(userService);

    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(userService.findByApiKey).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the API key is unknown', async () => {
    const userService = {
      findByApiKey: jest.fn().mockResolvedValue(null),
    } as unknown as UserService;
    const guard = new ApiKeyGuard(userService);

    await expect(guard.canActivate(makeContext('usr_unknown'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
