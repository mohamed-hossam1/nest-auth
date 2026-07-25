export const AUTH_MESSAGES = {
  SIGN_UP_SUCCESS:
    'Registration Successful. Please check your email to verify your account',
  SIGN_IN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REFRESH_SUCCESS: 'Token refreshed successfully',
  EMAIL_VERIFIED_SUCCESS: 'Email verified successfully',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  EMAIL_ALREADY_VERIFIED: 'Email is already verified',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_VERIFIED: 'Please verify your email',
  VERIFICATION_EMAIL_SENT:
    'If an account exists for this email, a verification link has been sent',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
  INVALID_ACCESS_TOKEN: 'Invalid or expired access token',
  INVALID_VERIFY_TOKEN: 'Invalid verification token',
  VERIFY_TOKEN_EXPIRED: 'Verification token has expired',
  VERIFICATION_RESEND_COOLDOWN:
    'Please wait before requesting another verification email',
  FORGOT_PASSWORD_SUCCESS:
    'If an account exists for this email, a password reset link has been sent',
  RESET_PASSWORD_SUCCESS: 'Password has been reset successfully',
  INVALID_RESET_TOKEN: 'Invalid or expired password reset token',
  RESET_TOKEN_EXPIRED: 'Password reset token has expired',
  SESSION_REVOKED_SUCCESS: 'Session revoked successfully',
  SESSIONS_REVOKED_OTHERS_SUCCESS: 'All other sessions revoked successfully',
  SESSION_NOT_FOUND: 'Session not found',
  CHANGE_PASSWORD_SUCCESS: 'Password has been changed successfully',
  CURRENT_PASSWORD_INVALID: 'Invalid current password',
  CURRENT_PASSWORD_AND_NEW_PASSWORD_ARE_THE_SAME:
    'Current password and new password are the same',
  USER_NOT_FOUND: 'User not found',
  USER_UPDATED_SUCCESS: 'User updated successfully',
  USER_DELETED_SUCCESS: 'User deleted successfully',
  NO_FIELDS_TO_UPDATE: 'At least one field must be provided to update',
  ACCOUNT_BANNED: 'Your account has been banned',
  USER_BANNED_SUCCESS: 'User banned successfully',
  USER_UNBANNED_SUCCESS: 'User unbanned successfully',
  USER_ALREADY_BANNED: 'User is already banned',
  USER_NOT_BANNED: 'User is not banned',
  CANNOT_BAN_SELF: 'You cannot ban your own account',
  FORBIDDEN: 'You do not have permission to perform this action',
} as const;

export const VALIDATION_MESSAGES = {
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters long',
  NAME_MAX_LENGTH: 'Name must be at most 100 characters long',
  AVATAR_URL_INVALID: 'Avatar URL must be a valid URL',
  AVATAR_URL_MAX_LENGTH: 'Avatar URL must be at most 2048 characters long',
  BAN_REASON_REQUIRED: 'Ban reason is required',
  BAN_REASON_MAX_LENGTH: 'Ban reason must be at most 500 characters long',
} as const;
