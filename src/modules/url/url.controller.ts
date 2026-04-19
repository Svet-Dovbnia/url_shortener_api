import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlResponseDto } from './dto/url-response.dto';
import { UrlStatsDto } from './dto/url-stats.dto';
import { RedirectResponseDto } from './dto/redirect-response.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('URL')
@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('url/shorten')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a short code for the given URL' })
  @ApiResponse({ status: HttpStatus.CREATED, type: UrlResponseDto })
  shorten(
    @Body() dto: CreateUrlDto,
    @CurrentUser() user: User,
  ): Promise<UrlResponseDto> {
    return this.urlService.shorten(dto, user);
  }

  @Get('url/:shortCode/stats')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Return visit stats for a short code' })
  @ApiParam({ name: 'shortCode' })
  @ApiResponse({ status: HttpStatus.OK, type: UrlStatsDto })
  getStats(
    @Param('shortCode') shortCode: string,
    @CurrentUser() user: User,
  ): Promise<UrlStatsDto> {
    return this.urlService.getStats(shortCode, user);
  }

  @Get(':shortCode')
  @ApiOperation({ summary: 'Resolve a short code to its original URL' })
  @ApiParam({ name: 'shortCode' })
  @ApiResponse({ status: HttpStatus.OK, type: RedirectResponseDto })
  resolve(@Param('shortCode') shortCode: string): Promise<RedirectResponseDto> {
    return this.urlService.resolve(shortCode);
  }
}
