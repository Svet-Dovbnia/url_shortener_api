import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUrl, Matches } from 'class-validator';

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

  @ApiPropertyOptional({
    description:
      'Optional custom short code (alphanumeric, 6–8 characters). PRO plan only.',
    example: 'myLink01',
    minLength: 6,
    maxLength: 8,
  })
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{6,8}$/, {
    message: 'shortCode must be 6–8 alphanumeric characters',
  })
  shortCode?: string;
}
