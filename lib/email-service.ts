import nodemailer from 'nodemailer'
import { EmailRequest } from '@/types'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Gmail configuration for mattpcasanova@gmail.com
    if (!process.env.GMAIL_APP_PASSWORD) {
      console.warn('GMAIL_APP_PASSWORD not set. Email functionality will be disabled.')
      this.transporter = null as any
      return
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mattpcasanova@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  }

  async sendStudyGuide(request: EmailRequest): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.error('Email service not configured. Please set GMAIL_APP_PASSWORD in your .env.local file.')
        return false
      }

      const mailOptions = {
        from: `"CasanovaStudy" <mattpcasanova@gmail.com>`,
        to: request.to,
        subject: request.subject,
        html: this.generateEmailHTML(request)
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log('Email sent:', info.messageId)
      return true
    } catch (error) {
      console.error('Email sending error:', error)
      return false
    }
  }

  private generateEmailHTML(request: EmailRequest): string {
    const fileName = 'study-guide.html'
    const fileSize = 'HTML Document'
    const currentYear = new Date().getFullYear()
    const ctaUrl = request.htmlUrl
    
    return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CasanovaStudy – Study Guide Ready</title>
    <!--[if mso]>
      <xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    <![endif]-->
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;">
    <!-- Preheader (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
      Your study guide is ready to view and download from CasanovaStudy.
    </div>

    <!-- Full-width wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f4f6f8;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <!-- Container (max 600) -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td align="left" style="padding:20px 24px;background-color:#4facfe;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td valign="middle" align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:24px;color:#ffffff;font-weight:bold;">
                      <!-- Logo/Brand -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td valign="middle" style="padding-right:8px;">
                            <div style="width:32px;height:32px;background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.1);">
                              CS
                            </div>
                          </td>
                          <td valign="middle">
                            <span style="display:inline-block;vertical-align:middle;">CasanovaStudy</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td valign="middle" align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#eaf6ff;">
                      Study made clearer
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title Block -->
            <tr>
              <td align="left" style="padding:24px 24px 8px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;color:#0f172a;font-weight:700;">
                  ${request.subject}
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#64748b;margin-top:4px;">
                  Your study guide is ready to view and download.
                </div>
              </td>
            </tr>

            <!-- Details -->
            <tr>
              <td align="left" style="padding:8px 24px 16px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td width="25%" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#475569;padding:6px 0;">Subject</td>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#0f172a;padding:6px 0;"><strong>Study Guide</strong></td>
                  </tr>
                  <tr>
                    <td width="25%" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#475569;padding:6px 0;">Format</td>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#0f172a;padding:6px 0;"><strong>HTML Document</strong></td>
                  </tr>
                  <tr>
                    <td width="25%" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#475569;padding:6px 0;">Generated</td>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#0f172a;padding:6px 0;"><strong>${new Date().toLocaleDateString()}</strong></td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Attachment Info -->
            <tr>
              <td align="left" style="padding:0 24px 8px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#475569;margin-bottom:6px;">Attachment</div>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                        <tr>
                          <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#0f172a;">
                            <strong style="display:inline-block;">${fileName}</strong>
                            <span style="display:inline-block;color:#64748b;">&nbsp;•&nbsp;${fileSize}</span>
                          </td>
                          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748b;">
                            HTML
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td align="center" style="padding:16px 24px 24px 24px;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="12%" stroke="f" fillcolor="#00f2fe">
                  <w:anchorlock/>
                  <center style="color:#0b2b3b;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">
                    View / Download Study Guide
                  </center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-- -->
                <a href="${ctaUrl}" target="_blank"
                   style="background-color:#00f2fe;border-radius:6px;color:#0b2b3b;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:260px;">
                  View / Download Study Guide
                </a>
                <!--<![endif]-->
              </td>
            </tr>

            <!-- Tips / Instructions (optional, concise) -->
            <tr>
              <td align="left" style="padding:0 24px 16px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748b;">
                  Having trouble with the button? Copy and paste this link into your browser:<br>
                  <span style="color:#0f172a;word-break:break-all;">${ctaUrl}</span>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:16px 24px 24px 24px;background-color:#f8fafc;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#94a3b8;">
                  © ${currentYear} CasanovaStudy • Learn with clarity
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#94a3b8;margin-top:4px;">
                  You're receiving this because you generated a study guide with CasanovaStudy.
                </div>
              </td>
            </tr>
          </table>

          <!-- Mobile spacing -->
          <div style="height:24px;line-height:24px;">&nbsp;</div>
        </td>
      </tr>
    </table>
  </body>
</html>`
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email service verification failed:', error)
      return false
    }
  }
}
