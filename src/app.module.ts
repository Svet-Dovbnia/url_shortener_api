import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { UserModule } from './modules/user/user.module';
import { UrlModule } from './modules/url/url.module';
import { CacheModule } from './common/cache/cache.module';
import { ApiKeyThrottlerGuard } from './common/guards/api-key-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CacheModule,
    UserModule,
    UrlModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyThrottlerGuard },
  ],
})
export class AppModule {}
