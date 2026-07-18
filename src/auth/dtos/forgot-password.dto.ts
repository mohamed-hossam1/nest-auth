import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';

export class ForgotPasswordDto {
  @ApiProperty({
    example: SWAGGER_EXAMPLES.email,
    required: true,
  })
  @IsEmail()
  email: string;
}
