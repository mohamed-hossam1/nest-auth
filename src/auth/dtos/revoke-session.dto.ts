import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RevokeSessionDto {
  @ApiProperty({
    description: 'ID of the refresh session to revoke',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;
}
