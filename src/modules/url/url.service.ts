import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { nanoid } from 'nanoid';
import { Url } from './url.entity';
import { Click } from './click.entity';
import { User, UserPlan } from '../user/user.entity';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlStatsDto } from './dto/url-stats.dto';

const SHORT_CODE_LENGTH = 8;

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

    const shortCode = await this.generateUniqueShortCode();
    const url = this.urlRepository.create({
      originalUrl: dto.originalUrl,
      shortCode,
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

    return {
      shortCode: url.shortCode,
      totalClicks: 0,
      message: 'Placeholder — analytics not yet implemented',
    };
  }

  async findByShortCodeOrFail(shortCode: string): Promise<Url> {
    const url = await this.urlRepository.findOne({ where: { shortCode } });
    if (!url) {
      throw new NotFoundException('Short URL not found');
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

  private async generateUniqueShortCode(): Promise<string> {
    while (true) {
      const code = nanoid(SHORT_CODE_LENGTH);
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
