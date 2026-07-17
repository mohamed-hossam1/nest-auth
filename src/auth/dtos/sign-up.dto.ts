import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class SignUpDto {
  @ApiProperty({
    example: SWAGGER_EXAMPLES.name,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.email,
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.password,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH })
  password: string;
}
