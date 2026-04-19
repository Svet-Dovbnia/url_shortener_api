import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './url.entity';
import { Click } from './click.entity';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { RedirectController } from './redirect.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Url, Click]), UserModule],
  controllers: [UrlController, RedirectController],
  providers: [UrlService],
  exports: [UrlService],
})
export class UrlModule {}
