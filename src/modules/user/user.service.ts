import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserPlan } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UsageResponseDto } from './dto/usage-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create({
      email: dto.email,
      plan: UserPlan.FREE,
    });
    return this.userRepository.save(user);
  }

  getUsage(): UsageResponseDto {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      plan: UserPlan.FREE,
      totalUrls: 0,
      message: 'Placeholder — quota tracking not yet implemented',
    };
  }
}
