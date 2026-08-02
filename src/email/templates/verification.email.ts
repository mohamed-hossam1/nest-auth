import { escapeHtml } from 'src/common/utils/html.util';
import { Email } from '../interfaces/email.interface';
import { renderEmailTemplate } from './layout.email';

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
    const greeting = safeName ? `Welcome ${safeName}!` : 'Welcome to Traqon!';

    const content = `
      <h1 style="margin:0 0 16px 0; font-family:Georgia, serif; font-style:italic; font-size:24px; font-weight:normal; color:#f2ede4;">${greeting}</h1>
      <p style="margin:0 0 20px 0; color:#b0a79a; font-size:14px; line-height:1.6;">
        Please confirm your email address to activate your account and finish setting up your Traqon workspace.
      </p>
      
      <div style="margin:28px 0; text-align:left;">
        <a href="${safeLink}" style="display:inline-block; background-color:#e6dfd5; color:#141311; font-family:'Courier New', Courier, monospace; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.15em; text-decoration:none; padding:16px 32px; border:1px solid #e6dfd5;">
          Verify Email Address
        </a>
      </div>

      <p style="margin:24px 0 0 0; color:#857d71; font-size:12px; font-style:italic; border-top:1px solid #2e2a24; padding-top:16px;">
        This link expires in 24 hours. If you did not create a Traqon account, you can safely ignore this message.
      </p>
    `;

    this.html = renderEmailTemplate({
      title: 'Verify your email address - Traqon',
      preheader: 'Confirm your email address to activate your Traqon account.',
      contentHtml: content,
    });
  }
}
