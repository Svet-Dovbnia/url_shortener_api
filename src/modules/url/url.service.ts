import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { Url } from './url.entity';
import { Click } from './click.entity';
import { User, UserPlan } from '../user/user.entity';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlStatsDto } from './dto/url-stats.dto';

const SHORT_CODE_LENGTH = 8;
const SHORT_CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const generateShortCode = customAlphabet(SHORT_CODE_ALPHABET, SHORT_CODE_LENGTH);
const RECENT_CLICKS_LIMIT = 50;

const MONTHLY_QUOTA: Record<UserPlan, number> = {
  [UserPlan.FREE]: 10,
  [UserPlan.PRO]: 100,
};

@Injectable()
export class UrlService {
  private readonly logger = new Logger(UrlService.name);

  constructor(
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,
    @InjectRepository(Click)
    private readonly clickRepository: Repository<Click>,
  ) {}

  async shorten(dto: CreateUrlDto, user: User): Promise<Url> {
    const limit = MONTHLY_QUOTA[user.plan];
    const monthStart = startOfCurrentMonth();

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
    const url = await this.findByShortCodeOrFail(shortCode);
    if (url.expiresAt && url.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Short URL has expired');
    }
    return url;
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
    while (true) {
      const code = generateShortCode();
      const exists = await this.urlRepository.exist({
        where: { shortCode: code },
      });
      if (!exists) {
        return code;
      }
    }
  }
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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
