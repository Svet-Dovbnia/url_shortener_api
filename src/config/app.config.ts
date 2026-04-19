import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  adminApiKey: string | null;
  redisUrl: string | null;
  urlCacheTtlSeconds: number;
}

export default registerAs<AppConfig>('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  adminApiKey: process.env.ADMIN_API_KEY?.trim() || null,
  redisUrl: process.env.REDIS_URL?.trim() || null,
  urlCacheTtlSeconds: parseInt(process.env.URL_CACHE_TTL_SECONDS ?? '300', 10),
}));
