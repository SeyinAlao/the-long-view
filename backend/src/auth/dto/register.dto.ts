import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { normaliseEmail } from '../../users/normalise-email';

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

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
