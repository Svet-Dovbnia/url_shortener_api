import { ApiProperty } from '@nestjs/swagger';

export class RedirectResponseDto {
  @ApiProperty({ example: 'aB3cD9eF' })
  shortCode!: string;

  @ApiProperty({ example: 'https://example.com/some/long/path' })
  originalUrl!: string;

  @ApiProperty({ example: 'Placeholder — redirect + analytics not yet implemented' })
  message!: string;
}
