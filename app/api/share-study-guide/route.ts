import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

interface ShareRequest {
  to: string
  studyGuideTitle: string
  studyGuideUrl: string
  senderName?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ShareRequest = await request.json()

    // Validate request
    if (!body.to || !body.studyGuideTitle || !body.studyGuideUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: to, studyGuideTitle, studyGuideUrl' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.to)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email is configured
    if (!process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mattpcasanova@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Generate email HTML
    const currentYear = new Date().getFullYear()
    const senderText = body.senderName ? `${body.senderName} has` : 'Someone has'
    const personalMessage = body.message
      ? `<tr>
          <td align="left" style="padding:0 24px 16px 24px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#475569;background-color:#f1f5f9;padding:16px;border-radius:8px;border-left:4px solid #4facfe;">
              "${body.message}"
            </div>
          </td>
        </tr>`
      : ''

    const emailHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Study Guide Shared with You</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f4f6f8;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td align="left" style="padding:24px;background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:28px;color:#ffffff;font-weight:bold;">
                      CasanovaStudy
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td align="left" style="padding:32px 24px 16px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#0f172a;font-weight:700;margin-bottom:8px;">
                  A Study Guide Has Been Shared With You!
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#64748b;">
                  ${senderText} shared the following study guide with you:
                </div>
              </td>
            </tr>

            <!-- Study Guide Title -->
            <tr>
              <td align="left" style="padding:0 24px 16px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;color:#4facfe;font-weight:600;padding:16px;background-color:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
                  ${body.studyGuideTitle}
                </div>
              </td>
            </tr>

            <!-- Personal Message -->
            ${personalMessage}

            <!-- CTA Button -->
            <tr>
              <td align="center" style="padding:16px 24px 32px 24px;">
                <a href="${body.studyGuideUrl}" target="_blank"
                   style="background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);border-radius:8px;color:#ffffff;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:52px;text-align:center;text-decoration:none;width:280px;box-shadow:0 4px 14px rgba(79, 172, 254, 0.4);">
                  View Study Guide
                </a>
              </td>
            </tr>

            <!-- Link fallback -->
            <tr>
              <td align="left" style="padding:0 24px 24px 24px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#94a3b8;">
                  Or copy this link: <a href="${body.studyGuideUrl}" style="color:#4facfe;word-break:break-all;">${body.studyGuideUrl}</a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:20px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#94a3b8;">
                  © ${currentYear} CasanovaStudy • AI-Powered Study Guides
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

    // Send email
    const mailOptions = {
      from: `"CasanovaStudy" <mattpcasanova@gmail.com>`,
      to: body.to,
      subject: `Study Guide Shared: ${body.studyGuideTitle}`,
      html: emailHTML
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Share email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
