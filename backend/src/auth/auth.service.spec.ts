import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'findByUsername' | 'create' | 'toSafeUser'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      toSafeUser: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    authService = new AuthService(usersService as unknown as UsersService, jwtService as unknown as JwtService);
  });

  describe('register', () => {
    it('hashes the password before storing it — never stores it in plain text', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockImplementation(async (input) => ({
        id: 'user_1',
        email: input.email,
        username: input.username,
        name: input.name,
        bio: null,
        avatarUrl: null,
        createdAt: new Date(),
      }));

      await authService.register({
        email: 'seyin@example.com',
        username: 'seyin',
        password: 'correct-horse-battery-staple',
        name: 'Seyin Alao',
      });

      const createArg = usersService.create.mock.calls[0][0];
      expect(createArg.passwordHash).not.toBe('correct-horse-battery-staple');
      expect(await bcrypt.compare('correct-horse-battery-staple', createArg.passwordHash)).toBe(true);
    });

    it('rejects a duplicate email before touching the username check', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'existing' } as any);
      usersService.findByUsername.mockResolvedValue(null);

      await expect(
        authService.register({
          email: 'taken@example.com',
          username: 'new_user',
          password: 'correct-horse-battery-staple',
          name: 'Someone',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a duplicate username', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue({ id: 'existing' } as any);

      await expect(
        authService.register({
          email: 'new@example.com',
          username: 'taken',
          password: 'correct-horse-battery-staple',
          name: 'Someone',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('rejects a login for an email that does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ghost@example.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a login with the wrong password', async () => {
      const realHash = await bcrypt.hash('the-real-password', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user_1',
        email: 'seyin@example.com',
        username: 'seyin',
        passwordHash: realHash,
        name: 'Seyin Alao',
        bio: null,
        avatarUrl: null,
        createdAt: new Date(),
      } as any);

      await expect(
        authService.login({ email: 'seyin@example.com', password: 'a-guess' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a token for the correct password and never leaks the hash', async () => {
      const realHash = await bcrypt.hash('the-real-password', 10);
      const rawUser = {
        id: 'user_1',
        email: 'seyin@example.com',
        username: 'seyin',
        passwordHash: realHash,
        name: 'Seyin Alao',
        bio: null,
        avatarUrl: null,
        createdAt: new Date(),
      };
      usersService.findByEmail.mockResolvedValue(rawUser as any);
      usersService.toSafeUser.mockReturnValue({
        id: rawUser.id,
        email: rawUser.email,
        username: rawUser.username,
        name: rawUser.name,
        bio: null,
        avatarUrl: null,
        createdAt: rawUser.createdAt,
      });

      const result = await authService.login({
        email: 'seyin@example.com',
        password: 'the-real-password',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user_1', email: 'seyin@example.com' });
    });
  });
});
