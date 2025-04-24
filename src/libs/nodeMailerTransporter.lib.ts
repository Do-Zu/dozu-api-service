import nodemailer from 'nodemailer';

const mailUser = process.env.MAIL_USERNAME;
const host = process.env.MAIL_HOST;
const password = process.env.MAIL_PASSWORD;

export const nodemailerTransporter = nodemailer.createTransport({
  host: host,
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: mailUser,
    pass: password,
  },
});

export const sendVerificationLinkEmail = async (email: string, verificationCode: string) => {
  const info = await nodemailerTransporter.sendMail({
    from: `"dozu" <${mailUser}>`, // sender address
    to: email, // list of receivers
    subject: 'Hello ✔', // Subject line
    text: `This is your verification link: http://localhost:3333/api/auth/verifyEmail?email=${email}&verificationCode=${verificationCode}`, // plain text body
    // html: '<b>Hello world?</b>', // html body
  });
  return info;
};
