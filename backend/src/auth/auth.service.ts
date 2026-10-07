import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService, SafeUser, RawUser } from '../users/users.service';
import { GoogleLinkService } from '../users/google-link.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';
import { LoginFailedException } from './login-failed.exception';

const SALT_ROUNDS = 10;

export type GoogleSignInResult =
  | { outcome: 'signed_in'; user: SafeUser; accessToken: string; passwordCleared: boolean }
  | { outcome: 'refused' };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly googleLink: GoogleLinkService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SafeUser; accessToken: string }> {
    const [existingEmail, existingUsername] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByUsername(dto.username),
    ]);

    if (existingEmail) {
      throw new ConflictException('An account with this email already exists');
    }
    if (existingUsername) {
      throw new ConflictException('That username is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      name: dto.name,
      acceptedTerms: dto.acceptedTerms,
    });

    return this.issueSession(user);
  }

  async acceptTerms(userId: string): Promise<SafeUser> {
    return this.usersService.acceptTerms(userId);
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; accessToken: string }> {
    const record = await this.usersService.findByEmail(dto.email);

    // Deliberately the same error for "no such user" and "wrong password" —
    // distinguishing them would let a caller enumerate valid emails.
    if (!record) {
      throw new LoginFailedException('unknown_email');
    }

    // A Google-only account has no passwordHash to compare against.
    // bcrypt.compare against null would throw an ugly, unrelated error —
    // this gives the person a straight answer instead.
    if (!record.passwordHash) {
      throw new LoginFailedException(
        'google_only',
        'This account uses Google sign-in. Use "Continue with Google" instead.',
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, record.passwordHash);
    if (!passwordMatches) {
      throw new LoginFailedException('bad_password');
    }

    return this.issueSession(record);
  }

  // Called after Passport's GoogleStrategy has verified the identity
  // with Google, including that Google has verified the email. Three
  // cases: this Google account has signed in before (find by googleId);
  // an account with this email exists (GoogleLinkService decides whether
  // it may be joined - ADR 003); or this is a new person (a fresh
  // account, no password).
  async loginWithGoogle(profile: GoogleProfile): Promise<GoogleSignInResult> {
    const byGoogleId = await this.usersService.findByGoogleId(profile.googleId);
    if (byGoogleId) {
      return { outcome: 'signed_in', ...this.issueSession(byGoogleId), passwordCleared: false };
    }

    const byEmail = await this.usersService.findByEmail(profile.email);
    if (byEmail) {
      const link = await this.googleLink.link(byEmail.id, profile.googleId);
      if (link.outcome === 'refused') {
        // The user id and reason only: never the email, a token or the Google id.
        this.logger.warn(`google_link_refused userId=${byEmail.id} reason=${link.reason}`);
        return { outcome: 'refused' };
      }
      return {
        outcome: 'signed_in',
        ...this.issueSession(link.user),
        passwordCleared: link.passwordCleared,
      };
    }

    const username = await this.usersService.generateUsernameFromEmail(profile.email);
    const user = await this.usersService.create({
      email: profile.email,
      username,
      name: profile.name,
      googleId: profile.googleId,
      passwordHash: null,
    });

    return { outcome: 'signed_in', ...this.issueSession(user), passwordCleared: false };
  }

  // Ends every session on every device (logout). See ADR 002.
  async endAllSessions(userId: string): Promise<void> {
    await this.usersService.endAllSessions(userId);
  }

  // The one place a session token is made. `sv` ties it to the user's
  // current session version, so raising that version ends it.
  private issueSession(record: RawUser): { user: SafeUser; accessToken: string } {
    const accessToken = this.jwtService.sign({
      sub: record.id,
      email: record.email,
      sv: record.sessionVersion,
    });
    return { user: this.usersService.toSafeUser(record), accessToken };
  }
}
