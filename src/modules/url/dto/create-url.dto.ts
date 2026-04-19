import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUrl } from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({ example: 'https://example.com/some/long/path?query=1' })
  @IsUrl({ require_protocol: true })
  originalUrl!: string;

  @ApiPropertyOptional({
    description: 'Optional ISO-8601 expiration timestamp (must be in the future)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
