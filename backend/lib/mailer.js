const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

let transporter = null;

function assertMailConfig() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Chưa cấu hình SMTP_USER/SMTP_PASS trong .env. Hãy dùng Gmail App Password.'
    );
  }
}

function getTransporter() {
  assertMailConfig();
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const transport = getTransporter();
  await transport.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    html,
    text,
  });
}

async function sendVerifyEmail(to, otp) {
  const subject = 'Mã xác minh email — Game Toán Học';
  const text = `Xin chào,\n\nMã OTP xác minh tài khoản của bạn: ${otp}\n\nMã hết hạn sau 10 phút. Nếu bạn không đăng ký, hãy bỏ qua email này.`;
  const html = `
    <p>Xin chào,</p>
    <p>Mã OTP xác minh tài khoản Game Toán Học:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#1d5f7a">${otp}</p>
    <p>Mã hết hạn sau <strong>10 phút</strong>.</p>
    <p style="color:#666;font-size:13px">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
  `;
  await sendMail({ to, subject, html, text });
}

async function sendResetPasswordEmail(to, otp) {
  const subject = 'Mã đặt lại mật khẩu — Game Toán Học';
  const text = `Xin chào,\n\nMã OTP đặt lại mật khẩu: ${otp}\n\nMã hết hạn sau 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
  const html = `
    <p>Xin chào,</p>
    <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Mã OTP:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#1d5f7a">${otp}</p>
    <p>Mã hết hạn sau <strong>10 phút</strong>.</p>
    <p style="color:#666;font-size:13px">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `;
  await sendMail({ to, subject, html, text });
}

if (!SMTP_USER || !SMTP_PASS) {
  console.warn('⚠️ SMTP chưa cấu hình (SMTP_USER/SMTP_PASS). Gửi email sẽ thất bại.');
}

module.exports = {
  sendVerifyEmail,
  sendResetPasswordEmail,
};
