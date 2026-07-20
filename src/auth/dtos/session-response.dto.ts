import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId: string;

  @ApiPropertyOptional({
    example: 'MacBook Pro',
    nullable: true,
  })
  deviceName: string | null;

  @ApiPropertyOptional({
    example: 'Chrome',
    nullable: true,
  })
  browser: string | null;

  @ApiPropertyOptional({
    example: 'macOS',
    nullable: true,
  })
  operatingSystem: string | null;

  @ApiPropertyOptional({
    example: '203.0.113.42',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiPropertyOptional({
    example: 'Cairo, Egypt',
    nullable: true,
    description: 'Approximate location when available',
  })
  location: string | null;

  @ApiProperty({
    example: '2026-07-20T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-07-20T12:30:00.000Z',
  })
  lastUsedAt: Date;

  @ApiProperty({
    example: true,
    description: 'Whether this session matches the current refresh cookie',
  })
  isCurrentSession: boolean;
}

export class SessionsListResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  sessions: SessionResponseDto[];
}
