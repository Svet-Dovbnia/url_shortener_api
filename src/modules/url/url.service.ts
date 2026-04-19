import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { Url } from './url.entity';
import { Click } from './click.entity';
import { User, UserPlan } from '../user/user.entity';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlStatsDto } from './dto/url-stats.dto';
import { MONTHLY_QUOTA, startOfCurrentMonthUTC } from './url.quota';
import { CacheService } from '../../common/cache/cache.service';
import { AppConfig } from '../../config/app.config';

const SHORT_CODE_LENGTH = 8;
const SHORT_CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SHORT_CODE_MAX_ATTEMPTS = 5;
const generateShortCode = customAlphabet(SHORT_CODE_ALPHABET, SHORT_CODE_LENGTH);
const RECENT_CLICKS_LIMIT = 50;

interface CachedUrl {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
}

function cacheKey(shortCode: string): string {
  return `url:code:${shortCode}`;
}

@Injectable()
export class UrlService {
  private readonly logger = new Logger(UrlService.name);

  constructor(
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,
    @InjectRepository(Click)
    private readonly clickRepository: Repository<Click>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async shorten(dto: CreateUrlDto, user: User): Promise<Url> {
    const limit = MONTHLY_QUOTA[user.plan];
    const monthStart = startOfCurrentMonthUTC();

    const usedThisMonth = await this.urlRepository.count({
      where: {
        userId: user.id,
        createdAt: MoreThanOrEqual(monthStart),
      },
    });

    if (usedThisMonth >= limit) {
      throw new ForbiddenException(
        `Monthly quota reached (${limit} URLs on the ${user.plan} plan)`,
      );
    }

    const expiresAt = parseFutureExpiry(dto.expiresAt);

    const shortCode = await this.resolveShortCode(dto.shortCode, user);
    const url = this.urlRepository.create({
      originalUrl: dto.originalUrl,
      shortCode,
      expiresAt,
      userId: user.id,
    });
    return this.urlRepository.save(url);
  }

  async getStats(shortCode: string, user: User): Promise<UrlStatsDto> {
    const url = await this.findByShortCodeOrFail(shortCode);

    if (url.userId !== user.id) {
      throw new ForbiddenException(
        'You can only view stats for your own URLs',
      );
    }

    if (user.plan !== UserPlan.PRO) {
      throw new ForbiddenException(
        'Stats are available on the PRO plan only',
      );
    }

    const [totalClicks, recent] = await Promise.all([
      this.clickRepository.count({ where: { urlId: url.id } }),
      this.clickRepository.find({
        where: { urlId: url.id },
        order: { createdAt: 'DESC' },
        take: RECENT_CLICKS_LIMIT,
      }),
    ]);

    return {
      shortCode: url.shortCode,
      totalClicks,
      recentClicks: recent.map((click) => ({
        timestamp: click.createdAt,
        ipAddress: click.ipAddress,
        userAgent: click.userAgent,
      })),
    };
  }

  async findByShortCodeOrFail(shortCode: string): Promise<Url> {
    const url = await this.urlRepository.findOne({ where: { shortCode } });
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }
    return url;
  }

  async findActiveByShortCodeOrFail(shortCode: string): Promise<Url> {
    const cached = await this.cacheService.get<CachedUrl>(cacheKey(shortCode));
    if (cached) {
      const revived = reviveCachedUrl(cached);
      if (isExpired(revived)) {
        await this.cacheService.del(cacheKey(shortCode));
        throw new GoneException('Short URL has expired');
      }
      return revived;
    }

    const url = await this.findByShortCodeOrFail(shortCode);
    if (isExpired(url)) {
      throw new GoneException('Short URL has expired');
    }
    void this.cacheService.set(cacheKey(shortCode), toCached(url), this.cacheTtlFor(url));
    return url;
  }

  private cacheTtlFor(url: Url): number {
    const defaultTtl = this.configService.getOrThrow<AppConfig>('app').urlCacheTtlSeconds;
    if (!url.expiresAt) return defaultTtl;
    const secondsUntilExpiry = Math.floor((url.expiresAt.getTime() - Date.now()) / 1000);
    return Math.max(0, Math.min(defaultTtl, secondsUntilExpiry));
  }

  async recordClick(
    urlId: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    try {
      await this.clickRepository.insert({ urlId, ipAddress, userAgent });
    } catch (err) {
      this.logger.error(
        `Failed to record click for url ${urlId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async resolveShortCode(
    requested: string | undefined,
    user: User,
  ): Promise<string> {
    if (!requested) {
      return this.generateUniqueShortCode();
    }

    if (user.plan !== UserPlan.PRO) {
      throw new ForbiddenException(
        'Custom short codes are available on the PRO plan only',
      );
    }

    const taken = await this.urlRepository.exist({
      where: { shortCode: requested },
    });
    if (taken) {
      throw new ConflictException('Short code is already taken');
    }
    return requested;
  }

  private async generateUniqueShortCode(): Promise<string> {
    for (let attempt = 1; attempt <= SHORT_CODE_MAX_ATTEMPTS; attempt += 1) {
      const code = generateShortCode();
      const exists = await this.urlRepository.exist({
        where: { shortCode: code },
      });
      if (!exists) {
        return code;
      }
    }
    this.logger.error(
      `Failed to generate a unique short code after ${SHORT_CODE_MAX_ATTEMPTS} attempts`,
    );
    throw new InternalServerErrorException(
      'Could not generate a unique short code, please retry',
    );
  }
}

function isExpired(url: Pick<Url, 'expiresAt'>): boolean {
  return url.expiresAt !== null && url.expiresAt.getTime() <= Date.now();
}

function toCached(url: Url): CachedUrl {
  return {
    id: url.id,
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
  };
}

function reviveCachedUrl(cached: CachedUrl): Url {
  return {
    id: cached.id,
    shortCode: cached.shortCode,
    originalUrl: cached.originalUrl,
    expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
  } as Url;
}

function parseFutureExpiry(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('expiresAt must be a valid ISO-8601 date');
  }
  if (parsed.getTime() <= Date.now()) {
    throw new BadRequestException('expiresAt must be in the future');
  }
  return parsed;
}
