import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
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
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { OAUTH_STATE_COOKIE, stateCookieOptions, type OAuthAppState } from './oauth-state-store';
import { safeNextPath } from './safe-next-path';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { SafeUser } from '../users/users.service';
import type { GoogleProfile } from './strategies/google.strategy';

const COOKIE_NAME = 'session_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

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
  // access. req.user is whatever GoogleStrategy.validate() returned, or
  // empty if Google sign-in failed or was refused (GoogleCallbackGuard).
  // Every outcome ends in a redirect to a page that explains it.
  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    // One sign-in, one state: gone whatever happens next.
    res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions(this.isProduction()));
    const profile = req.user as GoogleProfile | undefined;
    if (!profile) return res.redirect(`${frontendUrl}/login?error=google`);

    try {
      const result = await this.authService.loginWithGoogle(profile);
      if (result.outcome === 'refused') return res.redirect(`${frontendUrl}/login?error=google-link-refused`);

      this.setSessionCookie(res, result.accessToken);
      // The notice that Google replaced their password wins over going
      // back to where they were, so it is always seen.
      if (result.passwordCleared) return res.redirect(`${frontendUrl}/dashboard?notice=google-now-sign-in`);
      const next = safeNextPath((req.authInfo as { state?: OAuthAppState } | undefined)?.state?.next);
      return res.redirect(`${frontendUrl}${next ?? '/dashboard'}`);
    } catch (error) {
      // Includes a write conflict while linking (Prisma P2034): the
      // transaction rolled back, so nothing changed and no session was
      // issued. The name and code only - Prisma messages can quote data.
      const { name, code } = error as { name?: string; code?: string };
      this.logger.error(`google_sign_in_failed error=${name ?? 'unknown'} code=${code ?? '-'}`);
      return res.redirect(`${frontendUrl}/login?error=google`);
    }
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
      secure: this.isProduction(),
    };
  }

  private isProduction() {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
