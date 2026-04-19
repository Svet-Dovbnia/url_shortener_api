import { ApiProperty } from '@nestjs/swagger';
import { UserPlan } from '../user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' })
  apiKey!: string;

  @ApiProperty({ enum: UserPlan })
  plan!: UserPlan;

  @ApiProperty()
  createdAt!: Date;
}
