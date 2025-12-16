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
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback từ người dùng</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 24px;
    }
    .info-section {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .info-section p {
      margin: 5px 0;
      font-size: 14px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
    }
    .message-section {
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .image-section {
      margin-top: 20px;
      text-align: center;
    }
    .image-section img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      border: 1px solid #e0e0e0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 Phản hồi từ người dùng</h1>
    </div>
    
    <div class="info-section">
      <p><span class="info-label">Người gửi:</span> ${userInfo}</p>
      ${userId ? `<p><span class="info-label">User ID:</span> ${userId}</p>` : ''}
      <p><span class="info-label">Thời gian:</span> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
    </div>
    
    <div class="message-section">
      <strong>Nội dung phản hồi:</strong><br><br>
      ${message.replace(/\n/g, '<br>')}
    </div>
    
    ${imageUrl ? `
    <div class="image-section">
      <p><strong>Hình ảnh đính kèm:</strong></p>
      <img src="${imageUrl}" alt="Feedback Image" />
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống Dozu Learning Platform</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
📝 PHẢN HỒI TỪ NGƯỜI DÙNG

Người gửi: ${userInfo}
${userId ? `User ID: ${userId}\n` : ''}Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}

NỘI DUNG PHẢN HỒI:
${message}

${imageUrl ? `\nHình ảnh đính kèm: ${imageUrl}\n` : ''}

---
Email này được gửi tự động từ hệ thống Dozu Learning Platform
  `.trim();

  return { html, text };
}
