import nodemailer from 'nodemailer';

const mailUser = process.env.MAIL_USERNAME;
const host = process.env.MAIL_HOST;
const appPassword = process.env.MAIL_APP_PASSWORD;

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
    text: `This is your verification link: http://localhost:3333/api/auth/verify-email?email=${email}&verificationCode=${verificationCode}`, // plain text body
    // html: '<b>Hello world?</b>', // html body
  });
  return info;
};
