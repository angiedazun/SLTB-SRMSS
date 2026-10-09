const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || 'SLTB SRMSS <noreply@sltb.lk>';

  if (!transporter) {
    // Development fallback: print to console so devs can copy the link
    console.log('\n\x1b[36m📧 [EMAIL — DEV MODE]\x1b[0m');
    console.log(`\x1b[90mTo:      \x1b[0m${to}`);
    console.log(`\x1b[90mSubject: \x1b[0m${subject}`);
    console.log(`\x1b[90mBody:\x1b[0m`);
    console.log(text || html);
    console.log('\x1b[36m──────────────────────────────────────\x1b[0m\n');
    return;
  }

  await transporter.sendMail({ from, to, subject, html, text });
};

module.exports = { sendEmail };
