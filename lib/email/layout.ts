// Branded HTML email layout. Emails can't use the site's CSS, fonts or
// gradients reliably (Outlook), so this is table-based with inline styles,
// solid-color fallbacks and system/serif font stacks that echo the site.

export const BRAND = {
  blue: '#2563eb',
  blueDark: '#1e40af',
  cyan: '#06b6d4',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  page: '#f1f5f9',
  soft: '#eff6ff',
}

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const SERIF = "Georgia,'Times New Roman',serif"

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A bulletproof button (works in Outlook, which ignores padding on <a>). */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:0 auto;">
  <tr>
    <td align="center" bgcolor="${BRAND.blue}" style="border-radius:12px;background-color:${BRAND.blue};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:16px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:12px;">${label}</a>
    </td>
  </tr>
</table>`
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-family:${SERIF};font-size:28px;line-height:34px;font-weight:600;color:${BRAND.ink};">${text}</h1>`
}

export function paragraph(html: string, opts: { muted?: boolean; small?: boolean; center?: boolean } = {}): string {
  const size = opts.small ? '13px' : '16px'
  const lh = opts.small ? '20px' : '26px'
  return `<p style="margin:0 0 16px 0;font-family:${SANS};font-size:${size};line-height:${lh};color:${opts.muted ? BRAND.muted : BRAND.body};${opts.center ? 'text-align:center;' : ''}">${html}</p>`
}

/** Plain-link fallback under a button, for clients that block buttons. */
export function linkFallback(href: string): string {
  return paragraph(`Button not working? Copy this link into your browser:<br><a href="${href}" style="color:${BRAND.blue};word-break:break-all;">${href}</a>`, { muted: true, small: true })
}

/**
 * Wrap body HTML in the branded shell.
 * `preheader` is the grey preview text shown next to the subject in inboxes.
 */
export function emailLayout({ preheader, body, footer, siteUrl }: { preheader: string; body: string; footer: string; siteUrl: string }): string {
  const logo = `${siteUrl.replace(/\/$/, '')}/images/casanova-study-icon.png`
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Casanova Study</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background-color:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <!-- Brand bar -->
          <tr>
            <td bgcolor="${BRAND.blueDark}" style="background-color:${BRAND.blueDark};background-image:linear-gradient(120deg,${BRAND.blueDark} 0%,${BRAND.blue} 55%,${BRAND.cyan} 100%);border-radius:16px 16px 0 0;padding:20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#0f172a;border-radius:10px;width:36px;height:36px;" align="center" valign="middle">
                    <img src="${logo}" width="26" height="26" alt="" style="display:block;border:0;">
                  </td>
                  <td style="padding-left:10px;font-family:${SANS};font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Casanova Study</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:0 0 16px 16px;padding:36px 28px 28px 28px;border:1px solid ${BRAND.line};border-top:0;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px 0 28px;font-family:${SANS};font-size:12px;line-height:18px;color:#94a3b8;text-align:center;">
              ${footer}<br>
              <a href="${siteUrl}" style="color:#94a3b8;text-decoration:underline;">casanovastudy.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
