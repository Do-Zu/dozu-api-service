export interface FeedbackEmailData {
  message: string;
  userInfo: string;
  userId?: number;
  imageUrl?: string;
}

export function getFeedbackEmailTemplate(data: FeedbackEmailData): {
  html: string;
  text: string;
} {
  const { message, userInfo, userId, imageUrl } = data;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>User Feedback</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; font-family:Arial, Helvetica, sans-serif;">
          
          <!-- HEADER -->
          <tr>
            <td style="padding:20px 24px; background:linear-gradient(90deg,#22c55e,#16a34a); color:#ffffff;">
              <h1 style="margin:0; font-size:22px;">📝 User Feedback</h1>
              <p style="margin:6px 0 0; font-size:13px; opacity:0.9;">
                Dozu Learning Platform
              </p>
            </td>
          </tr>

          <!-- USER INFO -->
          <tr>
            <td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:14px; color:#374151;">
                    <strong>👤 Sender:</strong> ${userInfo}
                  </td>
                </tr>
                ${userId ? `
                <tr>
                  <td style="padding-top:6px; font-size:14px; color:#374151;">
                    <strong>🆔 User ID:</strong> ${userId}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding-top:6px; font-size:14px; color:#374151;">
                    <strong>⏰ Time:</strong>
                    ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MESSAGE -->
          <tr>
            <td style="padding:0 24px 24px;">
              <div style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px;">
                <p style="margin:0 0 8px; font-weight:600; font-size:15px; color:#111827;">
                  💬 Feedback Content
                </p>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#374151;">
                  ${message.replace(/\n/g, '<br>')}
                </p>
              </div>
            </td>
          </tr>

          <!-- IMAGE -->
          ${imageUrl ? `
          <tr>
            <td style="padding:0 24px 24px;">
              <p style="margin:0 0 8px; font-weight:600; font-size:14px; color:#111827;">
                🖼 Attached Image
              </p>
              <img
                src="${imageUrl}"
                alt="Feedback image"
                style="width:100%; max-width:100%; border-radius:8px; border:1px solid #e5e7eb;"
              />
            </td>
          </tr>
          ` : ''}

          <!-- FOOTER -->
          <tr>
            <td style="padding:16px 24px; background-color:#f9fafb; text-align:center;">
              <p style="margin:0; font-size:12px; color:#6b7280;">
                This email was automatically sent from the <strong>Dozu Learning Platform</strong> system
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
📝 USER FEEDBACK

Sender: ${userInfo}
${userId ? `User ID: ${userId}\n` : ''}Time: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}

FEEDBACK CONTENT:
${message}

${imageUrl ? `\nAttached Image: ${imageUrl}\n` : ''}

---
This email was automatically sent from the Dozu Learning Platform system
  `.trim();

  return { html, text };
}
