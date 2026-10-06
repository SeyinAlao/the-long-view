import { ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleLinkService } from '../users/google-link.service';

type StoredUser = NonNullable<Awaited<ReturnType<UsersService['findByEmail']>>>;

// A complete stored user, so mocks return what UsersService really does.
const storedUser = (overrides: Partial<StoredUser> = {}): StoredUser => ({
  id: 'user_1',
  email: 'seyin@example.com',
  username: 'seyin',
  name: 'Seyin Alao',
  bio: null,
  avatarUrl: null,
  createdAt: new Date(),
  passwordHash: null,
  googleId: null,
  sessionVersion: 0,
  ...overrides,
});

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

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      {} as GoogleLinkService,
    );
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
        passwordHash: input.passwordHash ?? null,
        googleId: null,
        sessionVersion: 0,
      }));

      await authService.register({
        email: 'seyin@example.com',
        username: 'seyin',
        password: 'correct-horse-battery-staple',
        name: 'Seyin Alao',
      });

      const createArg = usersService.create.mock.calls[0][0];
      expect(createArg.passwordHash).not.toBe('correct-horse-battery-staple');
      // register() always sets a passwordHash for a password-based signup —
      // this assertion just tells TS what the test already guarantees.
      expect(createArg.passwordHash).toBeTruthy();
      expect(await bcrypt.compare('correct-horse-battery-staple', createArg.passwordHash as string)).toBe(
        true,
      );
    });

    it('rejects a duplicate email before touching the username check', async () => {
      usersService.findByEmail.mockResolvedValue(storedUser({ id: 'existing' }));
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
      usersService.findByUsername.mockResolvedValue(storedUser({ id: 'existing' }));

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
      usersService.findByEmail.mockResolvedValue(storedUser({ passwordHash: realHash }));

      await expect(
        authService.login({ email: 'seyin@example.com', password: 'a-guess' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a token for the correct password and never leaks the hash', async () => {
      const realHash = await bcrypt.hash('the-real-password', 10);
      const rawUser = storedUser({ passwordHash: realHash, sessionVersion: 3 });
      usersService.findByEmail.mockResolvedValue(rawUser);
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
      // sv is the user's current session version: raising it (logout)
      // ends this token. Without it the token could never be revoked.
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user_1', email: 'seyin@example.com', sv: 3 });
    });
  });
});

describe('AuthService.loginWithGoogle', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByGoogleId' | 'findByEmail' | 'generateUsernameFromEmail' | 'create' | 'toSafeUser'>
  >;
  let googleLink: jest.Mocked<Pick<GoogleLinkService, 'link'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  const googleProfile = { googleId: 'g-123', email: 'seyin@example.com', name: 'Seyin Alao' };

  const safeUser = {
    id: 'user_1',
    email: 'seyin@example.com',
    username: 'seyin',
    name: 'Seyin Alao',
    bio: null,
    avatarUrl: null,
    createdAt: new Date(),
  };
  const rawUser = { ...safeUser, passwordHash: null, googleId: 'g-123', sessionVersion: 0 };

  beforeEach(() => {
    usersService = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      generateUsernameFromEmail: jest.fn(),
      create: jest.fn(),
      toSafeUser: jest.fn().mockReturnValue(safeUser),
    };
    googleLink = { link: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleLink as unknown as GoogleLinkService,
    );
  });

  it('signs in directly when this Google id has signed in before', async () => {
    usersService.findByGoogleId.mockResolvedValue(rawUser);

    const result = await authService.loginWithGoogle(googleProfile);

    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(googleLink.link).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'signed_in', user: safeUser, accessToken: 'signed.jwt.token', passwordCleared: false });
  });

  it('hands an existing account with this email to GoogleLinkService, and signs in when it links', async () => {
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ ...rawUser, googleId: null, passwordHash: 'hash' });
    googleLink.link.mockResolvedValue({ outcome: 'linked', user: { ...rawUser, sessionVersion: 1 }, passwordCleared: true });

    const result = await authService.loginWithGoogle(googleProfile);

    expect(googleLink.link).toHaveBeenCalledWith('user_1', 'g-123');
    expect(usersService.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ outcome: 'signed_in', passwordCleared: true });
    // The new token carries the raised session version.
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user_1', email: 'seyin@example.com', sv: 1 });
  });

  it('returns refused, issues no token, and logs only the user id and reason', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ ...rawUser, googleId: null, passwordHash: 'hash' });
    googleLink.link.mockResolvedValue({ outcome: 'refused', reason: 'published_work' });

    const result = await authService.loginWithGoogle(googleProfile);

    expect(result).toEqual({ outcome: 'refused' });
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('google_link_refused userId=user_1 reason=published_work');
    warn.mockRestore();
  });

  it('creates a brand new, passwordless account for a genuinely new person', async () => {
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.generateUsernameFromEmail.mockResolvedValue('seyin');
    usersService.create.mockResolvedValue(rawUser);

    const result = await authService.loginWithGoogle(googleProfile);

    expect(usersService.create).toHaveBeenCalledWith({
      email: 'seyin@example.com',
      username: 'seyin',
      name: 'Seyin Alao',
      googleId: 'g-123',
      passwordHash: null,
    });
    expect(result).toMatchObject({ outcome: 'signed_in', user: safeUser, passwordCleared: false });
  });
});
