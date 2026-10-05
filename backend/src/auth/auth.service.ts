import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService, SafeUser, RawUser } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
    });

    return this.issueSession(user);
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; accessToken: string }> {
    const record = await this.usersService.findByEmail(dto.email);

    // Deliberately the same error for "no such user" and "wrong password" —
    // distinguishing them would let a caller enumerate valid emails.
    if (!record) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // A Google-only account has no passwordHash to compare against.
    // bcrypt.compare against null would throw an ugly, unrelated error —
    // this gives the person a straight answer instead.
    if (!record.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Use "Continue with Google" instead.',
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, record.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSession(record);
  }

  // Called after Passport's GoogleStrategy has already verified the
  // identity with Google. Three cases: this Google account has signed in
  // before (find by googleId); this email already has a password account
  // (link the Google id onto it rather than creating a duplicate); or
  // this is a genuinely new person (create a fresh account, no password).
  async loginWithGoogle(profile: GoogleProfile): Promise<{ user: SafeUser; accessToken: string }> {
    const byGoogleId = await this.usersService.findByGoogleId(profile.googleId);
    if (byGoogleId) {
      return this.issueSession(byGoogleId);
    }

    const byEmail = await this.usersService.findByEmail(profile.email);
    if (byEmail) {
      return this.issueSession(await this.usersService.linkGoogleId(byEmail.id, profile.googleId));
    }

    const username = await this.usersService.generateUsernameFromEmail(profile.email);
    const user = await this.usersService.create({
      email: profile.email,
      username,
      name: profile.name,
      googleId: profile.googleId,
      passwordHash: null,
    });

    return this.issueSession(user);
  }

  // Ends every session on every device (logout). See ADR 002.
  async endAllSessions(userId: string): Promise<void> {
    await this.usersService.endAllSessions(userId);
  }

  // The one place a session token is made. `sv` ties it to the user's
  // current session version, so raising that version ends it.
  private issueSession(record: RawUser): { user: SafeUser; accessToken: string } {
    const accessToken = this.jwtService.sign({ sub: record.id, email: record.email, sv: record.sessionVersion });
    return { user: this.usersService.toSafeUser(record), accessToken };
  }
}
