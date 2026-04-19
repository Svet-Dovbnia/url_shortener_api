import { ApiProperty } from '@nestjs/swagger';
import { ClickEntryDto } from './click-entry.dto';

export class UrlStatsDto {
  @ApiProperty({ example: 'aB3cD9eF' })
  shortCode!: string;

  @ApiProperty({ example: 0 })
  totalClicks!: number;

  @ApiProperty({ type: [ClickEntryDto] })
  recentClicks!: ClickEntryDto[];
}
