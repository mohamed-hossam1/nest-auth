import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SWAGGER_EXAMPLES } from 'src/common/constants/examples.constant';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: SWAGGER_EXAMPLES.name,
    maxLength: 100,
    nullable: true,
    description: 'Display name. Send null to clear.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100, { message: VALIDATION_MESSAGES.NAME_MAX_LENGTH })
  name?: string | null;

  @ApiPropertyOptional({
    example: SWAGGER_EXAMPLES.avatarUrl,
    maxLength: 2048,
    nullable: true,
    description: 'Avatar image URL. Send null to clear.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsUrl(
    { require_protocol: true },
    { message: VALIDATION_MESSAGES.AVATAR_URL_INVALID },
  )
  @MaxLength(2048, { message: VALIDATION_MESSAGES.AVATAR_URL_MAX_LENGTH })
  avatarUrl?: string | null;
}
