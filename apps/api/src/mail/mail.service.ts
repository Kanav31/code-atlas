import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/** Escape user-controlled strings before interpolating into HTML email templates. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly apiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.apiUrl = config.get<string>('API_URL', 'http://localhost:3001');

    const mailUser = config.get<string>('MAIL_USER');
    const mailPass = config.get<string>('MAIL_PASS');
    this.from = config.get<string>('MAIL_FROM') ?? (mailUser ? `Code Atlas <${mailUser}>` : 'Code Atlas <agarwalkanav3108@gmail.com>');

    const port = Number(config.get<string>('MAIL_PORT', '1025'));
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('MAIL_HOST', 'localhost'),
      port,
      secure: port === 465,
      ...(mailUser && mailPass ? { auth: { user: mailUser, pass: mailPass } } : {}),
    });
  }

  async sendEmailVerification(email: string, name: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.send({
      to: email,
      subject: 'Verify your Code Atlas account',
      html: this.verifyEmailTemplate(name, link),
    });
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.send({
      to: email,
      subject: 'Reset your Code Atlas password',
      html: this.resetPasswordTemplate(name, link),
    });
  }

  async sendNewsletterWelcome(email: string, name: string, unsubscribeToken: string) {
    const unsubLink = `${this.apiUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
    await this.send({
      to: email,
      subject: 'Welcome to Code Atlas updates',
      html: this.newsletterWelcomeTemplate(name, unsubLink),
    });
  }

  async sendFeatureAnnouncement(
    email: string,
    name: string,
    featureTitle: string,
    featureDescription: string,
    unsubscribeToken: string,
  ) {
    const unsubLink = `${this.apiUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
    await this.send({
      to: email,
      subject: `New on Code Atlas: ${featureTitle}`,
      html: this.featureAnnouncementTemplate(name, featureTitle, featureDescription, unsubLink),
    });
  }

  private async send(options: { to: string; subject: string; html: string }) {
    try {
      await this.transporter.sendMail({ from: this.from, ...options });
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
    }
  }

  private baseTemplate(content: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin: 0; padding: 0; background: #06060a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8f2; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .logo { font-size: 20px; font-weight: 700; color: #e8e8f2; margin-bottom: 32px; letter-spacing: -0.5px; }
    .logo span { color: #34d399; }
    .card { background: #0c0c12; border: 1px solid #1e1e28; border-radius: 12px; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #e8e8f2; }
    p { font-size: 15px; line-height: 1.6; color: #b0b0c8; margin: 0 0 20px; }
    .btn { display: inline-block; background: #34d399; color: #06060a; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 8px 0 24px; }
    .footer { margin-top: 24px; font-size: 12px; color: #52526a; text-align: center; }
    a.unsub { color: #52526a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">Code <span>Atlas</span></div>
    <div class="card">${content}</div>
    <div class="footer">Code Atlas &mdash; Interactive Systems Engineering Platform</div>
  </div>
</body>
</html>`;
  }

  private verifyEmailTemplate(name: string, link: string) {
    return this.baseTemplate(`
      <h1>Verify your email</h1>
      <p>Hi ${esc(name)}, thanks for signing up for Code Atlas. Click below to verify your email address.</p>
      <a href="${esc(link)}" class="btn">Verify Email</a>
      <p style="font-size:13px;color:#52526a;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `);
  }

  private resetPasswordTemplate(name: string, link: string) {
    return this.baseTemplate(`
      <h1>Reset your password</h1>
      <p>Hi ${esc(name)}, we received a request to reset your Code Atlas password.</p>
      <a href="${esc(link)}" class="btn">Reset Password</a>
      <p style="font-size:13px;color:#52526a;">This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.</p>
    `);
  }

  private newsletterWelcomeTemplate(name: string, unsubLink: string) {
    return this.baseTemplate(`
      <h1>You're subscribed</h1>
      <p>Hi ${esc(name)}, you'll now be notified whenever we ship new features, modules, or improvements to Code Atlas.</p>
      <p>We send infrequent, high-quality updates — never spam.</p>
      <a href="${this.frontendUrl}/dashboard" class="btn">Go to Code Atlas</a>
      <p style="font-size:13px;color:#52526a;">Don't want updates? <a href="${esc(unsubLink)}" class="unsub">Unsubscribe</a>.</p>
    `);
  }

  private featureAnnouncementTemplate(
    name: string,
    title: string,
    description: string,
    unsubLink: string,
  ) {
    return this.baseTemplate(`
      <h1>${esc(title)}</h1>
      <p>Hi ${esc(name)}, something new just dropped on Code Atlas.</p>
      <p>${esc(description)}</p>
      <a href="${this.frontendUrl}/dashboard" class="btn">Check it out</a>
      <p style="font-size:13px;color:#52526a;"><a href="${esc(unsubLink)}" class="unsub">Unsubscribe from updates</a>.</p>
    `);
  }
}
