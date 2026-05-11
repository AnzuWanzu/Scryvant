import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export const generateOtp = (length = 6): string => {
  const min = 10 ** (length - 1);
  const maxExclusive = 10 ** length; // randomInt upper bound is exclusive
  const n = randomInt(min, maxExclusive);
  return n.toString();
};

export const hashOtp = async (otp: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

export const compareOtp = async (
  plain: string,
  hashed: string,
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 525, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "SCRYVANT | Your verification code",
    text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
  });
};
