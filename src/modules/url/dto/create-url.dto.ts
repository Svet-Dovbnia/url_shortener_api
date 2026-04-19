import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({ example: 'https://example.com/some/long/path?query=1' })
  @IsUrl({ require_protocol: true })
  originalUrl!: string;
}
