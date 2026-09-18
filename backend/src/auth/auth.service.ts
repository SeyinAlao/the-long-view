import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService, SafeUser } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

    return { user, accessToken: this.signToken(user.id, user.email) };
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; accessToken: string }> {
    const record = await this.usersService.findByEmail(dto.email);

    // Deliberately the same error for "no such user" and "wrong password" —
    // distinguishing them would let a caller enumerate valid emails.
    if (!record) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, record.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = this.usersService.toSafeUser(record);
    return { user, accessToken: this.signToken(user.id, user.email) };
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
