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
    it('returns userId, plan, and the total URL count for the caller', async () => {
      const user = { id: 'u1', plan: UserPlan.PRO } as User;
      urlRepo.count!.mockResolvedValue(7);

      const result = await service.getUsage(user);

      expect(urlRepo.count).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(result).toEqual({
        userId: 'u1',
        plan: UserPlan.PRO,
        totalUrls: 7,
      });
    });

    it('returns zero when the user has no URLs', async () => {
      const user = { id: 'u2', plan: UserPlan.FREE } as User;
      urlRepo.count!.mockResolvedValue(0);

      const result = await service.getUsage(user);

      expect(result).toEqual({
        userId: 'u2',
        plan: UserPlan.FREE,
        totalUrls: 0,
      });
    });
  });
});
