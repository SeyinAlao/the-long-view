import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PublicActivityService } from './public-activity.service';
import { GoogleLinkService } from './google-link.service';

@Module({
  providers: [UsersService, PublicActivityService, GoogleLinkService],
  exports: [UsersService, GoogleLinkService],
})
export class UsersModule {}
