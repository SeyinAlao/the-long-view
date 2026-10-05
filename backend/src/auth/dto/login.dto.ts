import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { normaliseEmail } from '../../users/normalise-email';

export class LoginDto {
  // Normalised before it is validated, so a pasted "  Ana@X.com " is accepted
  // and is the same account as ana@x.com.
  @Transform(({ value }) => (typeof value === 'string' ? normaliseEmail(value) : value))
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
