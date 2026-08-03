import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class ChangePasswordDto {
  @ApiProperty({
    example: SWAGGER_EXAMPLES.password,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH })
  oldPassword: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.password,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH })
  newPassword: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether to revoke all other active refresh sessions',
  })
  @IsOptional()
  @IsBoolean()
  revokeOtherSessions?: boolean;
}
