import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { NormalizedEmail } from 'src/common/decorators/normalized-email.decorator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class SignInDto {
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
