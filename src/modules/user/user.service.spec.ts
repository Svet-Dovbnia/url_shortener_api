import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User, UserPlan } from './user.entity';
import { Url } from '../url/url.entity';
import { CreateUserDto } from './dto/create-user.dto';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = <T extends object>(): MockRepo<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
});

describe('UserService', () => {
  let service: UserService;
  let userRepo: MockRepo<User>;
  let urlRepo: MockRepo<Url>;

  beforeEach(async () => {
    userRepo = createMockRepo<User>();
    urlRepo = createMockRepo<Url>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Url), useValue: urlRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('creates a user with the FREE plan and persists it', async () => {
      const dto: CreateUserDto = { email: 'user@example.com' };
      const built = { email: dto.email, plan: UserPlan.FREE } as User;
      const saved = {
        id: 'user-id',
        email: dto.email,
        plan: UserPlan.FREE,
        apiKey: 'usr_generated',
      } as User;

      userRepo.create!.mockReturnValue(built);
      userRepo.save!.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(userRepo.create).toHaveBeenCalledWith({
        email: dto.email,
        plan: UserPlan.FREE,
      });
      expect(userRepo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });
  });

  describe('findByApiKey', () => {
    it('returns the user when the API key matches', async () => {
      const user = { id: 'u1', apiKey: 'usr_abc' } as User;
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.findByApiKey('usr_abc');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { apiKey: 'usr_abc' },
      });
      expect(result).toBe(user);
    });

    it('returns null when no user owns the API key', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByApiKey('usr_unknown');

      expect(result).toBeNull();
    });
  });

  describe('getUsage', () => {
    it('returns the quota window for a PRO caller', async () => {
      const user = { id: 'u1', plan: UserPlan.PRO } as User;
      urlRepo.count!.mockResolvedValue(7);

      const result = await service.getUsage(user);

      expect(urlRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: user.id }),
        }),
      );
      expect(result).toMatchObject({
        userId: 'u1',
        plan: UserPlan.PRO,
        limit: 100,
        usedThisMonth: 7,
        remaining: 93,
      });
      expect(result.resetsAt).toBeInstanceOf(Date);
    });

    it('returns full remaining quota for a FREE user with no URLs this month', async () => {
      const user = { id: 'u2', plan: UserPlan.FREE } as User;
      urlRepo.count!.mockResolvedValue(0);

      const result = await service.getUsage(user);

      expect(result).toMatchObject({
        userId: 'u2',
        plan: UserPlan.FREE,
        limit: 10,
        usedThisMonth: 0,
        remaining: 10,
      });
    });

    it('clamps remaining at zero when usage has reached the limit', async () => {
      const user = { id: 'u3', plan: UserPlan.FREE } as User;
      urlRepo.count!.mockResolvedValue(10);

      const result = await service.getUsage(user);

      expect(result.remaining).toBe(0);
    });
  });
});
