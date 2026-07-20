import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { normalizeEmail } from 'src/common/utils/email.util';

export function NormalizedEmail() {
  return applyDecorators(
    ApiProperty({
      example: SWAGGER_EXAMPLES.email,
      required: true,
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normalizeEmail(value) : value,
    ),
    IsEmail(),
  );
}
