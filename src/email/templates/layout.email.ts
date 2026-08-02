export function renderEmailTemplate({
  title,
  preheader,
  contentHtml,
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#141311; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#141311;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#141311; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px; background-color:#1f1d19; border:1px solid #332f28;">
          
          <tr>
            <td style="padding:32px 32px 24px 32px; border-bottom:1px solid #332f28;">
              <span style="font-family:'Courier New', Courier, monospace; font-size:14px; font-weight:bold; letter-spacing:0.25em; text-transform:uppercase; color:#c85a32;">TRAQON</span>
            </td>
          </tr>

          <tr>
            <td style="padding:32px; color:#e6dfd5; font-size:15px; line-height:1.6;">
              ${contentHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background-color:#181613; border-top:1px solid #332f28; font-family:'Courier New', Courier, monospace; font-size:11px; color:#857d71; text-transform:uppercase; letter-spacing:0.1em;">
              © ${new Date().getFullYear()} Traqon App · Security & Verification
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
