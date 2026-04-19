import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Url } from '../url/url.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Url])],
  controllers: [UserController],
  providers: [UserService, ApiKeyGuard, AdminApiKeyGuard],
  exports: [UserService, ApiKeyGuard],
})
export class UserModule {}
