import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { SafeUser } from '../users/users.service';
import type { GoogleProfile } from './strategies/google.strategy';

const COOKIE_NAME = 'session_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken } = await this.authService.register(dto);
    this.setSessionCookie(res, accessToken);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken } = await this.authService.login(dto);
    this.setSessionCookie(res, accessToken);
    return { user };
  }

  // Ends every session this person has, on every device (ADR 002), when
  // the request carries a valid one; always clears this browser's cookie.
  // A cross-site form can't trigger the first part: the cookie is
  // SameSite=Lax, so it isn't sent on a cross-site POST (browser test:
  // e2e/tests/cross-site-logout.spec.ts).
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async logout(@CurrentUser() user: SafeUser | undefined, @Res({ passthrough: true }) res: Response) {
    if (user) await this.authService.endAllSessions(user.id);
    res.clearCookie(COOKIE_NAME, this.cookieOptions());
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: SafeUser) {
    return { user };
  }

  // Passport's GoogleAuthGuard intercepts this request and redirects the
  // browser to Google before this handler body ever runs.
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  // Google redirects back here after the person approves (or denies)
  // access. req.user is whatever GoogleStrategy.validate() returned.
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as GoogleProfile;
    const { accessToken } = await this.authService.loginWithGoogle(profile);
    this.setSessionCookie(res, accessToken);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/dashboard`);
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, { ...this.cookieOptions(), maxAge: SEVEN_DAYS_MS });
  }

  // Shared by setting and clearing: a browser only removes a cookie when
  // the clearing attributes match the ones it was set with.
  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.get<string>('NODE_ENV') === 'production',
    };
  }
}
