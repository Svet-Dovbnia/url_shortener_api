import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UrlService } from './url.service';
import { Url } from './url.entity';
import { Click } from './click.entity';
import { User, UserPlan } from '../user/user.entity';
import { CreateUrlDto } from './dto/create-url.dto';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = <T extends object>(): MockRepo<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  find: jest.fn(),
  insert: jest.fn(),
  exist: jest.fn(),
});

const makeUser = (overrides: Partial<User> = {}): User =>
  ({ id: 'u1', plan: UserPlan.FREE, ...overrides }) as User;

describe('UrlService', () => {
  let service: UrlService;
  let urlRepo: MockRepo<Url>;
  let clickRepo: MockRepo<Click>;

  beforeEach(async () => {
    urlRepo = createMockRepo<Url>();
    clickRepo = createMockRepo<Click>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        { provide: getRepositoryToken(Url), useValue: urlRepo },
        { provide: getRepositoryToken(Click), useValue: clickRepo },
      ],
    }).compile();

    service = module.get<UrlService>(UrlService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  describe('shorten', () => {
    const dto: CreateUrlDto = { originalUrl: 'https://example.com/long' };

    it('creates a URL when the user is under the monthly quota', async () => {
      const user = makeUser({ plan: UserPlan.FREE });
      urlRepo.count!.mockResolvedValue(5);
      urlRepo.exist!.mockResolvedValue(false);
      urlRepo.create!.mockImplementation((entity) => entity);
      urlRepo.save!.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'url-1' }),
      );

      const result = await service.shorten(dto, user);

      expect(urlRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: user.id }),
        }),
      );
      expect(urlRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        id: 'url-1',
        userId: user.id,
        originalUrl: dto.originalUrl,
      });
    });

    it('throws ForbiddenException when a FREE user has already shortened 10 URLs this month', async () => {
      const user = makeUser({ plan: UserPlan.FREE });
      urlRepo.count!.mockResolvedValue(10);

      await expect(service.shorten(dto, user)).rejects.toThrow(
        /Monthly quota reached/,
      );
      expect(urlRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a PRO user has already shortened 100 URLs this month', async () => {
      const user = makeUser({ plan: UserPlan.PRO });
      urlRepo.count!.mockResolvedValue(100);

      await expect(service.shorten(dto, user)).rejects.toThrow(
        /Monthly quota reached/,
      );
      expect(urlRepo.save).not.toHaveBeenCalled();
    });

    it('retries short-code generation on collision', async () => {
      const user = makeUser({ plan: UserPlan.FREE });
      urlRepo.count!.mockResolvedValue(0);
      urlRepo.exist!
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      urlRepo.create!.mockImplementation((entity) => entity);
      urlRepo.save!.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'url-1' }),
      );

      await service.shorten(dto, user);

      expect(urlRepo.exist).toHaveBeenCalledTimes(2);
      expect(urlRepo.save).toHaveBeenCalledTimes(1);
    });

    it('persists a future expiresAt on the new URL', async () => {
      const user = makeUser({ plan: UserPlan.FREE });
      urlRepo.count!.mockResolvedValue(0);
      urlRepo.exist!.mockResolvedValue(false);
      urlRepo.create!.mockImplementation((entity) => entity);
      urlRepo.save!.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'url-1' }),
      );

      const future = new Date(Date.now() + 86_400_000).toISOString();
      await service.shorten({ ...dto, expiresAt: future }, user);

      expect(urlRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: new Date(future) }),
      );
    });

    it('rejects an expiresAt that is not in the future', async () => {
      const user = makeUser({ plan: UserPlan.FREE });
      urlRepo.count!.mockResolvedValue(0);

      const past = new Date(Date.now() - 1_000).toISOString();
      await expect(
        service.shorten({ ...dto, expiresAt: past }, user),
      ).rejects.toThrow('expiresAt must be in the future');
      expect(urlRepo.save).not.toHaveBeenCalled();
    });

    it('uses a custom short code for a PRO user when it is available', async () => {
      const user = makeUser({ plan: UserPlan.PRO });
      urlRepo.count!.mockResolvedValue(0);
      urlRepo.exist!.mockResolvedValue(false);
      urlRepo.create!.mockImplementation((entity) => entity);
      urlRepo.save!.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'url-1' }),
      );

      const result = await service.shorten(
        { ...dto, shortCode: 'myLink01' },
        user,
      );

      expect(urlRepo.exist).toHaveBeenCalledWith(
        expect.objectContaining({ where: { shortCode: 'myLink01' } }),
      );
      expect(result).toMatchObject({ shortCode: 'myLink01' });
    });

    it('throws ConflictException when a PRO user requests a taken short code', async () => {
      const user = makeUser({ plan: UserPlan.PRO });
      urlRepo.count!.mockResolvedValue(0);
      urlRepo.exist!.mockResolvedValue(true);

      await expect(
        service.shorten({ ...dto, shortCode: 'myLink01' }, user),
      ).rejects.toThrow('Short code is already taken');
      expect(urlRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a FREE user requests a custom short code', async () => {
      const user = makeUser({ plan: UserPlan.FREE });
      urlRepo.count!.mockResolvedValue(0);

      await expect(
        service.shorten({ ...dto, shortCode: 'myLink01' }, user),
      ).rejects.toThrow(/PRO plan only/);
      expect(urlRepo.exist).not.toHaveBeenCalled();
      expect(urlRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByShortCodeOrFail', () => {
    it('returns the URL when one exists for the code', async () => {
      const url = { id: 'url-1', shortCode: 'abc' } as Url;
      urlRepo.findOne!.mockResolvedValue(url);

      await expect(service.findByShortCodeOrFail('abc')).resolves.toBe(url);
    });

    it('throws NotFoundException with the spec message when the code is unknown', async () => {
      urlRepo.findOne!.mockResolvedValue(null);

      await expect(service.findByShortCodeOrFail('missing')).rejects.toThrow(
        'Short URL not found',
      );
    });
  });

  describe('findActiveByShortCodeOrFail', () => {
    it('returns the URL when it has no expiration', async () => {
      const url = { id: 'url-1', shortCode: 'abc', expiresAt: null } as Url;
      urlRepo.findOne!.mockResolvedValue(url);

      await expect(service.findActiveByShortCodeOrFail('abc')).resolves.toBe(url);
    });

    it('returns the URL when expiresAt is in the future', async () => {
      const url = {
        id: 'url-1',
        shortCode: 'abc',
        expiresAt: new Date(Date.now() + 60_000),
      } as Url;
      urlRepo.findOne!.mockResolvedValue(url);

      await expect(service.findActiveByShortCodeOrFail('abc')).resolves.toBe(url);
    });

    it('throws GoneException when expiresAt is in the past', async () => {
      urlRepo.findOne!.mockResolvedValue({
        id: 'url-1',
        shortCode: 'abc',
        expiresAt: new Date(Date.now() - 60_000),
      } as Url);

      await expect(
        service.findActiveByShortCodeOrFail('abc'),
      ).rejects.toThrow('Short URL has expired');
    });

    it('propagates NotFoundException when the code is unknown', async () => {
      urlRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.findActiveByShortCodeOrFail('missing'),
      ).rejects.toThrow('Short URL not found');
    });
  });

  describe('getStats', () => {
    it('throws NotFoundException when the short code does not exist', async () => {
      urlRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getStats('missing', makeUser({ plan: UserPlan.PRO })),
      ).rejects.toThrow('Short URL not found');
    });

    it('throws ForbiddenException when the URL belongs to another user', async () => {
      urlRepo.findOne!.mockResolvedValue({
        id: 'url-1',
        userId: 'someone-else',
        shortCode: 'abc',
      } as Url);

      await expect(
        service.getStats('abc', makeUser({ id: 'u1', plan: UserPlan.PRO })),
      ).rejects.toThrow('You can only view stats for your own URLs');
    });

    it('throws ForbiddenException when the owner is on the FREE plan', async () => {
      urlRepo.findOne!.mockResolvedValue({
        id: 'url-1',
        userId: 'u1',
        shortCode: 'abc',
      } as Url);

      await expect(
        service.getStats('abc', makeUser({ id: 'u1', plan: UserPlan.FREE })),
      ).rejects.toThrow('Stats are available on the PRO plan only');
      expect(clickRepo.count).not.toHaveBeenCalled();
    });

    it('returns total clicks and recent click history for a PRO owner', async () => {
      const url = { id: 'url-1', userId: 'u1', shortCode: 'abc' } as Url;
      urlRepo.findOne!.mockResolvedValue(url);

      clickRepo.count!.mockResolvedValue(42);
      const ts = new Date('2025-01-01T00:00:00Z');
      clickRepo.find!.mockResolvedValue([
        {
          id: 'c1',
          urlId: url.id,
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0',
          createdAt: ts,
        },
      ]);

      const result = await service.getStats(
        'abc',
        makeUser({ id: 'u1', plan: UserPlan.PRO }),
      );

      expect(clickRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { urlId: url.id },
          order: { createdAt: 'DESC' },
          take: 50,
        }),
      );
      expect(result).toEqual({
        shortCode: 'abc',
        totalClicks: 42,
        recentClicks: [
          {
            timestamp: ts,
            ipAddress: '203.0.113.1',
            userAgent: 'Mozilla/5.0',
          },
        ],
      });
    });
  });

  describe('recordClick', () => {
    it('inserts a click row with the given metadata', async () => {
      clickRepo.insert!.mockResolvedValue(undefined);

      await service.recordClick('url-1', '203.0.113.1', 'ua/1');

      expect(clickRepo.insert).toHaveBeenCalledWith({
        urlId: 'url-1',
        ipAddress: '203.0.113.1',
        userAgent: 'ua/1',
      });
    });

    it('swallows insert errors so the redirect is never blocked', async () => {
      clickRepo.insert!.mockRejectedValue(new Error('db down'));

      await expect(
        service.recordClick('url-1', null, null),
      ).resolves.toBeUndefined();
    });
  });
});
