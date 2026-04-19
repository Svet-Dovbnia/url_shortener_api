import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, QueryFailedError, Repository } from 'typeorm';
import { User, UserPlan } from './user.entity';
import { Url } from '../url/url.entity';
import {
  MONTHLY_QUOTA,
  startOfCurrentMonthUTC,
  startOfNextMonthUTC,
} from '../url/url.quota';
import { CreateUserDto } from './dto/create-user.dto';
import { UsageResponseDto } from './dto/usage-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create({
      email: dto.email,
      plan: UserPlan.FREE,
    });
    try {
      return await this.userRepository.save(user);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  findByApiKey(apiKey: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { apiKey } });
  }

  async getUsage(user: User): Promise<UsageResponseDto> {
    const limit = MONTHLY_QUOTA[user.plan];
    const usedThisMonth = await this.urlRepository.count({
      where: {
        userId: user.id,
        createdAt: MoreThanOrEqual(startOfCurrentMonthUTC()),
      },
    });
    return {
      userId: user.id,
      plan: user.plan,
      limit,
      usedThisMonth,
      remaining: Math.max(0, limit - usedThisMonth),
      resetsAt: startOfNextMonthUTC(),
    };
  }
}

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as { code?: string })?.code === UNIQUE_VIOLATION
  );
}
