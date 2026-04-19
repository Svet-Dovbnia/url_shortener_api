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

  @ApiProperty({ format: 'uuid' })
  userId!: string;
}
