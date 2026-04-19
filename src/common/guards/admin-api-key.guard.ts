import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../../config/app.config';

const ADMIN_KEY_HEADER = 'x-admin-key';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);
  private warnedOpen = false;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.getOrThrow<AppConfig>('app').adminApiKey;

    if (!expected) {
      if (!this.warnedOpen) {
        this.logger.warn(
          'ADMIN_API_KEY is not set — POST /user is open. Set it for production.',
        );
        this.warnedOpen = true;
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header(ADMIN_KEY_HEADER);
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Admin API key is required');
    }
    return true;
  }
}
