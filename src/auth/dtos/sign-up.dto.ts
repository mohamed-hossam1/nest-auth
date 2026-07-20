import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizedEmail } from 'src/common/decorators/normalized-email.decorator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class SignUpDto {
  @ApiPropertyOptional({
    example: SWAGGER_EXAMPLES.name,
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: VALIDATION_MESSAGES.NAME_MAX_LENGTH })
  name?: string;

  @NormalizedEmail()
  email: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.password,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH })
  password: string;
}
