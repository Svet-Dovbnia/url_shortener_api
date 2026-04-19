import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../../modules/user/user.service';
import { User } from '../../modules/user/user.entity';

const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();

    const apiKey = request.header(API_KEY_HEADER);
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const user = await this.userService.findByApiKey(apiKey);
    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.user = user;
    return true;
  }
}
