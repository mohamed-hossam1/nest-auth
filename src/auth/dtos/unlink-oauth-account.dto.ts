import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UnlinkOauthAccountDto {
  @ApiProperty({
    example: 'google',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  provider: string;
}
