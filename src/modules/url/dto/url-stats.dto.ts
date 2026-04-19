import { ApiProperty } from '@nestjs/swagger';

export class UrlStatsDto {
  @ApiProperty({ example: 'aB3cD9eF' })
  shortCode!: string;

  @ApiProperty({ example: 0 })
  totalClicks!: number;

  @ApiProperty({ example: 'Placeholder — analytics not yet implemented' })
  message!: string;
}
