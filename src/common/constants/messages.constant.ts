export const AUTH_MESSAGES = {
  SIGN_UP_SUCCESS:
    'Registration Successful. Please check your email to verify your account',
  SIGN_IN_SUCCESS: 'Login successful',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_VERIFIED: 'Please verify your email',
  VERIFICATION_RESEND_COOLDOWN:
    'Please wait before requesting another verification email',
} as const;

export const VALIDATION_MESSAGES = {
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters long',
} as const;
