import { Controller, Get, HttpStatus, Param, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UrlService } from './url.service';

@ApiTags('Redirect')
@Controller()
export class RedirectController {
  constructor(private readonly urlService: UrlService) {}

  @Get(':shortCode')
  @ApiOperation({ summary: 'Redirect a short code to its original URL' })
  @ApiParam({ name: 'shortCode' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to the original URL',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Short URL not found',
  })
  @ApiResponse({
    status: HttpStatus.GONE,
    description: 'Short URL has expired',
  })
  async resolve(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.urlService.findActiveByShortCodeOrFail(shortCode);
    // Fire-and-forget: redirect is never blocked by the click insert.
    // Trade-off: the promise still runs in-process. At scale, publish to a
    // queue (e.g. BullMQ/Kafka/SQS) so analytics is truly out-of-band.
    void this.urlService.recordClick(
      url.id,
      req.ip ?? null,
      req.headers['user-agent'] ?? null,
    );
    res.redirect(HttpStatus.FOUND, url.originalUrl);
  }
}
