import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.password,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH })
  password: string;
}
