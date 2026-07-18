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
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
  INVALID_ACCESS_TOKEN: 'Invalid or expired access token',
  INVALID_VERIFY_TOKEN: 'Invalid verification token',
  VERIFY_TOKEN_EXPIRED: 'Verification token has expired',
  VERIFICATION_RESEND_COOLDOWN:
    'Please wait before requesting another verification email',
  FORGOT_PASSWORD_SUCCESS:
    'If an account exists for this email, a password reset link has been sent',
  PASSWORD_RESET_RESEND_COOLDOWN:
    'Please wait before requesting another password reset email',
} as const;

export const VALIDATION_MESSAGES = {
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters long',
} as const;
