import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThesesService } from './theses.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { UpdateThesisDto } from './dto/update-thesis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SafeUser } from '../users/users.service';

@Controller('theses')
export class ThesesController {
  constructor(private readonly thesesService: ThesesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateThesisDto) {
    return this.thesesService.createDraft(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@CurrentUser() user: SafeUser, @Param('id') id: string, @Body() dto: UpdateThesisDto) {
    return this.thesesService.updateDraft(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  publish(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.thesesService.publish(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  discard(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.thesesService.discardDraft(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@CurrentUser() user: SafeUser) {
    return this.thesesService.findMine(user.id);
  }

  @Get()
  findPublished(
    @Query('ticker') ticker?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.thesesService.findPublished({
      ticker,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: SafeUser | undefined, @Param('id') id: string) {
    return this.thesesService.findOne(id, user?.id);
  }
}
