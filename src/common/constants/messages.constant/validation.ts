export const VALIDATION_MESSAGES = {
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters long',
  NAME_MAX_LENGTH: 'Name must be at most 100 characters long',
  AVATAR_URL_INVALID: 'Avatar URL must be a valid URL',
  AVATAR_URL_MAX_LENGTH: 'Avatar URL must be at most 2048 characters long',
  BAN_REASON_REQUIRED: 'Ban reason is required',
  BAN_REASON_MAX_LENGTH: 'Ban reason must be at most 500 characters long',
} as const;
