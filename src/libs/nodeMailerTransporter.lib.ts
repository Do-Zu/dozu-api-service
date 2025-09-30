import nodemailer from 'nodemailer';

const mailUser = process.env.MAIL_USERNAME;
const host = process.env.MAIL_HOST;
const appPassword = process.env.MAIL_APP_PASSWORD;
const backendBaseUrl = process.env.BACKEND_BASE_URL;
const frontendBaseUrl = process.env.FRONTEND_BASE_URL;

export const nodemailerTransporter = nodemailer.createTransport({
    service: 'gmail',

    auth: {
        user: mailUser,
        pass: appPassword,
    },
});

export const sendVerificationLinkEmail = async (email: string, verificationCode: string) => {
    const info = await nodemailerTransporter.sendMail({
        from: `"dozu" <${mailUser}>`, // sender address
        to: email, // list of receivers
        subject: 'Hello ✔', // Subject line
        //verify in backend then redirect to frontend
        text: `This is your verification link: ${backendBaseUrl}/api/auth/verify-email?email=${email}&verificationCode=${verificationCode}`,
        // html: '<b>Hello world?</b>', // html body
    });
    return info;
};

export const sendChangePasswordLinkEmail = async ({
    email,
    verificationCode,
}: {
    email: string;
    verificationCode: string;
}) => {
    const info = await nodemailerTransporter.sendMail({
        from: `"dozu" <${mailUser}>`, // sender address
        to: email, // receiver
        subject: 'Reset your Dozu password', // subject line
        text: `You requested to reset your password. 
Please click the link below to proceed:

${frontendBaseUrl}/auth/changePassword?email=${email}&verificationCode=${verificationCode}

If you did not request this, you can safely ignore this email.`,
        // html: `<p>You requested to reset your password. Click the link below:</p>
        // <a href="${backendBaseUrl}/api/auth/change-password?email=${email}&verificationCode=${verificationCode}">Reset Password</a>
        // <p>If you didn’t request this, please ignore.</p>`,
    });

    return info;
};
