import nodemailer from "nodemailer";
import Env from "../config/handelEnv.js";

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: Env.EMAIL,
      pass: Env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Learnova" <${Env.EMAIL}>`,
    to,
    subject,
    html,
  });
};