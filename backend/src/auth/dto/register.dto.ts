import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { normaliseEmail } from '../../users/normalise-email';
import { MaxUtf8Bytes } from './max-utf8-bytes.decorator';

// bcrypt ignores every byte past the 72nd (audit F-14).
const BCRYPT_MAX_BYTES = 72;

export class RegisterDto {
  // Normalised before it is validated, so a pasted "  Ana@X.com " is accepted
  // and is the same account as ana@x.com.
  @Transform(({ value }) => (typeof value === 'string' ? normaliseEmail(value) : value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username!: string;

  // Only at sign-up: an existing password longer than this still signs
  // in (bcrypt compares its first 72 bytes, as it always has).
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxUtf8Bytes(BCRYPT_MAX_BYTES, {
    message:
      'password must be at most 72 bytes: 72 plain letters, digits or symbols, or fewer if it includes accented letters or emoji',
  })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
