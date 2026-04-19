import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
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
    return this.userRepository.save(user);
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
