import { ApiProperty } from '@nestjs/swagger';

export class ClickEntryDto {
  @ApiProperty()
  timestamp!: Date;

  @ApiProperty({ nullable: true, example: '203.0.113.42' })
  ipAddress!: string | null;

  @ApiProperty({ nullable: true, example: 'Mozilla/5.0 ...' })
  userAgent!: string | null;
}
