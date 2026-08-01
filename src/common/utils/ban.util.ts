import { ForbiddenException } from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';

type BanCheckable = {
  isBanned: boolean;
  banReason?: string | null;
};

export function assertUserNotBanned(user: BanCheckable): void {
  if (!user.isBanned) {
    return;
  }

  const reason = user.banReason?.trim();
  throw new ForbiddenException(
    reason
      ? `${AUTH_MESSAGES.ACCOUNT_BANNED}: ${reason}`
      : AUTH_MESSAGES.ACCOUNT_BANNED,
  );
}
