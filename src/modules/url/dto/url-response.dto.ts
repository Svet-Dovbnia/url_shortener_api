import { ApiProperty } from '@nestjs/swagger';

export class UrlResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'aB3cD9eF' })
  shortCode!: string;

  @ApiProperty({ example: 'https://example.com/some/long/path' })
  originalUrl!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'date-time',
    example: '2026-12-31T23:59:59.000Z',
  })
  expiresAt!: Date | null;

  @ApiProperty({ format: 'uuid' })
  userId!: string;
}
