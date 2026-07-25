import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class BanUserDto {
  @ApiProperty({
    example: 'Violation of community guidelines',
    description: 'Reason the user is being banned',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.BAN_REASON_REQUIRED })
  @MaxLength(500, { message: VALIDATION_MESSAGES.BAN_REASON_MAX_LENGTH })
  banReason: string;
}
