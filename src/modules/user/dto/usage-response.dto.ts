import { ApiProperty } from '@nestjs/swagger';
import { UserPlan } from '../user.entity';

export class UsageResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: UserPlan })
  plan!: UserPlan;

  @ApiProperty({ example: 10, description: 'Monthly URL quota for the plan' })
  limit!: number;

  @ApiProperty({
    example: 3,
    description: 'URLs created in the current calendar month (UTC)',
  })
  usedThisMonth!: number;

  @ApiProperty({
    example: 7,
    description: 'URLs remaining in the current quota window',
  })
  remaining!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-01T00:00:00.000Z',
    description: 'When the quota counter resets (start of next month, UTC)',
  })
  resetsAt!: Date;
}
