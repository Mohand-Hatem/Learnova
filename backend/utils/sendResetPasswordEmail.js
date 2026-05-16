import nodemailer from "nodemailer";
import Env from "../config/handelEnv.js";

const sendResetPasswordEmail = async (to, name, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: Env.EMAIL,
      pass: Env.EMAIL_PASS,
    },
  });

  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:40px;">
    
    <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#2563eb,#1e40af); padding:25px; text-align:center;">
        <h1 style="color:white; margin:0; font-size:26px;">Aventra</h1>
        <p style="color:#dbeafe; margin-top:8px;">Learn. Build. Grow.</p>
      </div>

      <!-- Body -->
      <div style="padding:35px; text-align:center;">
        
        <h2 style="color:#111827; margin-bottom:10px;">
          Password Reset Request 🔐
        </h2>

        <p style="color:#6b7280; font-size:15px; line-height:1.6;">
          Hi <b>${name}</b>, we received a request to reset your password.<br/>
          Use the OTP code below to proceed. It expires in <b>10 minutes</b>.
        </p>

        <!-- OTP Box -->
        <div style="margin:30px auto; display:inline-block; background:#eff6ff; border:2px dashed #2563eb; border-radius:12px; padding:20px 40px;">
          <p style="margin:0; font-size:13px; color:#6b7280; letter-spacing:1px; text-transform:uppercase;">Your OTP Code</p>
          <p style="margin:10px 0 0; font-size:38px; font-weight:bold; color:#1e40af; letter-spacing:8px;">${otp}</p>
        </div>

        <p style="color:#9ca3af; font-size:13px; margin-top:20px;">
          If you did not request a password reset, please ignore this email.<br/>
          Your account remains secure.
        </p>

      </div>

      <!-- Footer -->
      <div style="background:#f9fafb; padding:15px; text-align:center;">
        <p style="margin:0; font-size:12px; color:#9ca3af;">
          © ${new Date().getFullYear()} Aventra. All rights reserved.
        </p>
      </div>

    </div>

  </div>
  `;

  await transporter.sendMail({
    from: `"Aventra" <${Env.EMAIL}>`,
    to,
    subject: "Reset Your Aventra Password 🔐",
    html: htmlTemplate,
  });
};

export default sendResetPasswordEmail;
