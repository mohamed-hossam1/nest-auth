import { Email } from '../interfaces/email.interface';

export class PasswordResetEmail implements Email {
  readonly subject = 'Reset your password';
  readonly html: string;

  constructor(
    public readonly to: string,
    public readonly name: string | null,
    public readonly resetLink: string,
  ) {
    const greeting = name ? `Hi ${name},` : 'Hi,';
    this.html = `
      <h2>${greeting} Password Reset Request</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetLink}">Reset Password</a>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `;
  }
}
