import { escapeHtml } from 'src/common/utils/html.util';
import { Email } from '../interfaces/email.interface';

export class VerificationEmail implements Email {
  readonly subject = 'Verify your email address';
  readonly html: string;

  constructor(
    public readonly to: string,
    public readonly name: string | null,
    public readonly verificationLink: string,
  ) {
    const safeName = name ? escapeHtml(name) : null;
    const safeLink = escapeHtml(verificationLink);
    const greeting = safeName ? `Welcome ${safeName}!` : 'Welcome!';

    this.html = `
      <h2>${greeting} Please verify your email</h2>
      <p>Open the link below to continue verification. This link expires in 24 hours.</p>
      <p>Your email is verified only after you confirm on that page — opening or scanning the link alone does not complete verification.</p>
      <a href="${safeLink}">Continue to Verify Email</a>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `;
  }
}
