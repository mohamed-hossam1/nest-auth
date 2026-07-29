import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { BanUserDto } from './dtos/ban-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { BanUserService } from './services/ban-user.service';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserService } from './services/update-user.service';
import { ROLES } from 'src/db/schema';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly deleteUserService: DeleteUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly banUserService: BanUserService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  me(@User() user: AuthUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        ban: null,
      },
    };
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Authenticated users can update their own name and avatarUrl only.',
  })
  updateMe(@User() user: AuthUser, @Body() updateUserDto: UpdateUserDto) {
    return this.updateUserService.updateMe(user, updateUserDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a user profile',
    description: 'Admin-only. Updates any user profile.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to update',
    format: 'uuid',
  })
  update(
    @User() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.updateUserService.update(user, id, updateUserDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Delete current user account',
    description:
      'Authenticated users can delete their own account. Clears the refresh cookie.',
  })
  deleteMe(@User() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.deleteUserService.deleteMe(user, res);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Admin-only. Deletes any user.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to delete',
    format: 'uuid',
  })
  delete(
    @User() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deleteUserService.delete(user, id, res);
  }

  @Post(':id/ban')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ban a user',
    description:
      'Admin-only. Creates a row in user_bans, sets isBanned, and revokes all of the user sessions.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to ban',
    format: 'uuid',
  })
  ban(
    @User() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() banUserDto: BanUserDto,
  ) {
    return this.banUserService.ban(user, id, banUserDto);
  }

  @Post(':id/unban')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unban a user',
    description:
      'Admin-only. Deletes the user_bans row and clears the isBanned flag.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to unban',
    format: 'uuid',
  })
  unban(@User() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.banUserService.unban(user, id);
  }
}
