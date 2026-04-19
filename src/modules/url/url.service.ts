import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nanoid } from 'nanoid';
import { Url } from './url.entity';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlStatsDto } from './dto/url-stats.dto';
import { RedirectResponseDto } from './dto/redirect-response.dto';
import { User } from '../user/user.entity';

const SHORT_CODE_LENGTH = 8;

@Injectable()
export class UrlService {
  constructor(
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,
  ) {}

  private async generateUniqueShortCode(): Promise<string> {
    let code: string;
    let exists: boolean;

    do {
      code = nanoid(SHORT_CODE_LENGTH);
      exists = !!(await this.urlRepository.findOne({ where: { shortCode: code } }));
    } while (exists);

    return code;
  }

  async shorten(dto: CreateUrlDto, user: User): Promise<Url> {
    const url = this.urlRepository.create({
      originalUrl: dto.originalUrl,
      shortCode: nanoid(this.generateUniqueShortCode()),
      userId: user.id,
    });
    return this.urlRepository.save(url);
  }

  async resolve(shortCode: string): Promise<RedirectResponseDto> {
    const url = await this.urlRepository.findOne({ where: { shortCode } });
    if (!url) {
      throw new NotFoundException(`Short code "${shortCode}" not found`);
    }
    return {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      message: 'Placeholder — redirect + analytics not yet implemented',
    };
  }

  async getStats(shortCode: string): Promise<UrlStatsDto> {
    const url = await this.urlRepository.findOne({ where: { shortCode } });
    if (!url) {
      throw new NotFoundException('Short URL not found');
    }
    return {
      shortCode: url.shortCode,
      totalVisits: 0,
      message: 'Short URL not found',
    };
  }
}
