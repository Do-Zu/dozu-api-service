import nodemailer from 'nodemailer';

const mailUser = process.env.MAIL_USERNAME;
const host = process.env.MAIL_HOST;
const appPassword = process.env.MAIL_APP_PASSWORD;
const backendBaseUrl = process.env.BACKEND_BASE_URL;

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
