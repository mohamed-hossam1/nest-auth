import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.a1b2c3d4e5f6...',
    required: true,
    description: 'Email verification token from the verification email link',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
