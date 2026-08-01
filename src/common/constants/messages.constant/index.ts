import { SIGN_UP_MESSAGES } from './sign-up';
import { SIGN_IN_MESSAGES } from './sign-in';
import { LOGOUT_MESSAGES } from './logout';
import { REFRESH_MESSAGES } from './refresh';
import { VERIFY_EMAIL_MESSAGES } from './verify-email';
import { RESEND_VERIFICATION_MESSAGES } from './resend-verification';
import { FORGOT_PASSWORD_MESSAGES } from './forgot-password';
import { RESET_PASSWORD_MESSAGES } from './reset-password';
import { CHANGE_PASSWORD_MESSAGES } from './change-password';
import { SESSIONS_MESSAGES } from './sessions';
import { USER_MESSAGES } from './user';
import { BAN_USER_MESSAGES } from './ban-user';
import { COMMON_MESSAGES } from './common';
import { VALIDATION_MESSAGES } from './validation';
import { OAUTH_MESSAGES } from './oauth';

export const AUTH_MESSAGES = {
  ...SIGN_UP_MESSAGES,
  ...SIGN_IN_MESSAGES,
  ...LOGOUT_MESSAGES,
  ...REFRESH_MESSAGES,
  ...VERIFY_EMAIL_MESSAGES,
  ...RESEND_VERIFICATION_MESSAGES,
  ...FORGOT_PASSWORD_MESSAGES,
  ...RESET_PASSWORD_MESSAGES,
  ...CHANGE_PASSWORD_MESSAGES,
  ...SESSIONS_MESSAGES,
  ...USER_MESSAGES,
  ...BAN_USER_MESSAGES,
  ...COMMON_MESSAGES,
  ...OAUTH_MESSAGES,
} as const;

export { VALIDATION_MESSAGES };
