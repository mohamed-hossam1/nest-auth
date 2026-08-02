import { escapeHtml } from 'src/common/utils/html.util';
import { Email } from '../interfaces/email.interface';
import { renderEmailTemplate } from './layout.email';

export class PasswordResetEmail implements Email {
  readonly subject = 'Reset your password';
  readonly html: string;

  constructor(
    public readonly to: string,
    public readonly name: string | null,
    public readonly resetLink: string,
  ) {
    const safeName = name ? escapeHtml(name) : null;
    const safeLink = escapeHtml(resetLink);
    const greeting = safeName ? `Hi ${safeName},` : 'Hi,';

    const content = `
      <h1 style="margin:0 0 16px 0; font-family:Georgia, serif; font-style:italic; font-size:24px; font-weight:normal; color:#f2ede4;">${greeting}</h1>
      <p style="margin:0 0 20px 0; color:#b0a79a; font-size:14px; line-height:1.6;">
        We received a request to reset your password for your Traqon account. Click the button below to set a new password.
      </p>
      
      <div style="margin:28px 0; text-align:left;">
        <a href="${safeLink}" style="display:inline-block; background-color:#e6dfd5; color:#141311; font-family:'Courier New', Courier, monospace; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.15em; text-decoration:none; padding:16px 32px; border:1px solid #e6dfd5;">
          Reset Password
        </a>
      </div>

      <p style="margin:24px 0 0 0; color:#857d71; font-size:12px; font-style:italic; border-top:1px solid #2e2a24; padding-top:16px;">
        This reset link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    `;

    this.html = renderEmailTemplate({
      title: 'Reset your password - Traqon',
      preheader: 'Reset your password for your Traqon account.',
      contentHtml: content,
    });
  }
}
