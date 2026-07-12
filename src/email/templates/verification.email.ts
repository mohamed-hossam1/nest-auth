import { Email } from '../interfaces/email.interface';

export class VerificationEmail implements Email {
  readonly subject = 'Verify your email address';
  readonly html: string;

  constructor(
    public readonly to: string,
    public readonly name: string,
    public readonly verificationLink: string,
  ) {
    this.html = `
      <h2>Welcome ${name}! Please verify your email</h2>
      <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `;
  }
}
