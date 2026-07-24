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
import { User } from 'src/common/decorators/user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { UpdateUserDto } from './dtos/update-user.dto';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserService } from './services/update-user.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly deleteUserService: DeleteUserService,
    private readonly updateUserService: UpdateUserService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  me(@User() user: AuthUser) {
    return { user };
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a user profile',
    description:
      'Admins can update any user. Regular users can only update their own profile. Accepts name and avatarUrl only.',
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Admins can delete any user. Regular users can only delete their own account. Self-deletion clears the refresh cookie.',
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
}
