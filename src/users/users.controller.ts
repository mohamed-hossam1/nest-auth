import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { DeleteUserService } from './services/delete-user.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly deleteUserService: DeleteUserService) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  me(@User() user: AuthUser) {
    return { user };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
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
