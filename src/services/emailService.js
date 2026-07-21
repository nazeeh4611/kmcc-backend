import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendMail = async ({ to, subject, html }) => {
  const t = getTransporter();
  return t.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
};

export const sendPasswordResetEmail = async (email, rawToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/admin/reset-password?token=${rawToken}`;
  return sendMail({
    to: email,
    subject: "Reset your password — Global KMCC Anganganadi Panchayath",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0B5D1E;">Reset your password</h2>
        <p>We received a request to reset your admin password. This link expires in 30 minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#0B5D1E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Reset Password
          </a>
        </p>
        <p style="color:#64748B;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

export const sendMembershipReminderEmail = async (email, member, daysRemaining) => {
  const subject =
    daysRemaining <= 0
      ? "Your membership has expired"
      : `Your membership expires in ${daysRemaining} day(s)`;

  return sendMail({
    to: email,
    subject,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0B5D1E;">Membership Reminder</h2>
        <p>Dear ${member.fullName},</p>
        <p>
          ${
            daysRemaining <= 0
              ? "Your membership with Global KMCC Anganganadi Panchayath has expired. Please renew to continue enjoying member benefits."
              : `Your membership (ID: ${member.membershipId}) will expire in <strong>${daysRemaining} day(s)</strong>.`
          }
        </p>
        <p>Please log in to your member dashboard to renew.</p>
      </div>
    `,
  });
};

export const sendWelcomeEmail = async (email, member) => {
  return sendMail({
    to: email,
    subject: "Welcome to Global KMCC Anganganadi Panchayath",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0B5D1E;">Welcome, ${member.fullName}!</h2>
        <p>Your membership has been created successfully.</p>
        <p><strong>Membership ID:</strong> ${member.membershipId}</p>
        <p>Use your Membership ID and the password provided to you to log in to the member dashboard.</p>
      </div>
    `,
  });
};

export default { sendPasswordResetEmail, sendMembershipReminderEmail, sendWelcomeEmail };
