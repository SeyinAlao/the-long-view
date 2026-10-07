import { ValidateBy, type ValidationOptions } from 'class-validator';

// A maximum in bytes, not characters: bcrypt only reads the first 72
// bytes of a password and silently ignores the rest (audit F-14), and an
// accented letter or an emoji takes 2-4 bytes in UTF-8. class-validator's
// MaxLength counts characters, so it can't express this.
export function MaxUtf8Bytes(max: number, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxUtf8Bytes',
      constraints: [max],
      validator: { validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max },
    },
    options,
  );
}
