export interface ClassInvitationEmailData {
    className: string;
    teacherName: string;
    inviteLink: string;
    studentName?: string;
    expiresAt: Date;
}

export const classInvitationTemplate = (data: ClassInvitationEmailData): string => {
    const { className, teacherName, inviteLink, studentName, expiresAt } = data;
    const greeting = studentName ? `Xin chào ${studentName},` : 'Xin chào,';
    const expiresDate = expiresAt.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lời mời tham gia lớp học</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .title {
            color: #2c3e50;
            font-size: 20px;
            margin: 0;
        }
        .content {
            margin-bottom: 30px;
        }
        .class-info {
            background-color: #f8f9fa;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .class-name {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .teacher-name {
            color: #7f8c8d;
            font-style: italic;
        }
        .cta-button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #45a049;
        }
        .footer {
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
            margin-top: 30px;
            font-size: 14px;
            color: #7f8c8d;
            text-align: center;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
            font-size: 14px;
        }
        .link-fallback {
            word-break: break-all;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎓 Dozu Learning</div>
            <h1 class="title">Lời mời tham gia lớp học</h1>
        </div>
        
        <div class="content">
            <p>${greeting}</p>
            
            <p>Bạn đã được mời tham gia lớp học trên nền tảng Dozu Learning!</p>
            
            <div class="class-info">
                <div class="class-name">📚 ${className}</div>
                <div class="teacher-name">👨‍🏫 Giảng viên: ${teacherName}</div>
            </div>
            
            <p>Để tham gia lớp học, vui lòng nhấp vào nút bên dưới:</p>
            
            <div style="text-align: center;">
                <a href="${inviteLink}" class="cta-button">🚀 Tham gia lớp học ngay</a>
            </div>
            
            <div class="warning">
                ⚠️ <strong>Lưu ý:</strong> Link mời này sẽ hết hạn vào ${expiresDate}. 
                Vui lòng sử dụng link trước thời gian này.
            </div>
            
            <p>Nếu nút trên không hoạt động, bạn có thể sao chép và dán link sau vào trình duyệt:</p>
            <div class="link-fallback">${inviteLink}</div>
            
            <p>Chúc bạn học tập hiệu quả!</p>
        </div>
        
        <div class="footer">
            <p>Email này được gửi tự động từ hệ thống Dozu Learning.</p>
            <p>Nếu bạn không mong muốn nhận email này, vui lòng bỏ qua.</p>
            <p>© 2024 Dozu Learning. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
};

export const classInvitationTextTemplate = (data: ClassInvitationEmailData): string => {
    const { className, teacherName, inviteLink, studentName, expiresAt } = data;
    const greeting = studentName ? `Xin chào ${studentName},` : 'Xin chào,';
    const expiresDate = expiresAt.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
🎓 DOZU LEARNING - LỜI MỜI THAM GIA LỚP HỌC

${greeting}

Bạn đã được mời tham gia lớp học trên nền tảng Dozu Learning!

📚 Lớp học: ${className}
👨‍🏫 Giảng viên: ${teacherName}

🚀 Để tham gia lớp học, vui lòng truy cập link sau:
${inviteLink}

⚠️ LƯU Ý: Link mời này sẽ hết hạn vào ${expiresDate}.
Vui lòng sử dụng link trước thời gian này.

Chúc bạn học tập hiệu quả!

---
Email này được gửi tự động từ hệ thống Dozu Learning.
Nếu bạn không mong muốn nhận email này, vui lòng bỏ qua.
© 2024 Dozu Learning. All rights reserved.
    `.trim();
};
