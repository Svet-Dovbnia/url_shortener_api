import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/app.config';
import { CacheService, REDIS_CLIENT } from './cache.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis | null => {
        const { redisUrl } = configService.getOrThrow<AppConfig>('app');
        if (!redisUrl) {
          new Logger('CacheModule').log(
            'REDIS_URL not set — cache disabled',
          );
          return null;
        }

        const logger = new Logger('RedisClient');
        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
          lazyConnect: false,
        });
        client.on('connect', () => logger.log(`connected to ${redisUrl}`));
        client.on('error', (err) => logger.warn(`error: ${err.message}`));
        return client;
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
