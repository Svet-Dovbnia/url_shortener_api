import { ApiProperty } from '@nestjs/swagger';
import { UserPlan } from '../user.entity';

export class UsageResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: UserPlan })
  plan!: UserPlan;

  @ApiProperty({ example: 0 })
  totalUrls!: number;
}
