import fs from 'fs';
import path from 'path';

/**
 * UOS Academic Email Dispatcher Service
 * Supports SMTP (via nodemailer if installed) or safe mock logging in development
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  async init() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        // Dynamically import nodemailer if present
        const nodemailer = await import('nodemailer');
        this.transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT || '587', 10),
          secure: SMTP_PORT === '465',
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });
        this.isConfigured = true;
        console.log(`[Email Service] Connected to SMTP server ${SMTP_HOST}`);
      } catch (err) {
        console.log('[Email Service] Nodemailer not installed or failed to initialize. Falling back to console/file mock mode.');
      }
    } else {
      console.log('[Email Service] SMTP credentials not set in .env. Running in development simulation mode.');
    }
  }

  /**
   * Send notification to HOD when a teacher requests attendance unlock
   */
  async notifyHodOfOverrideRequest({ hodEmail, hodName, teacherName, courseCode, courseTitle, sectionName, reason, requestedAt }) {
    const subject = `[Action Required] Attendance Unlock Request: ${teacherName} (${courseCode})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #047857;">University of Sahiwal — Attendance Management Portal</h2>
        <p>Dear <strong>${hodName || 'Head of Department'}</strong>,</p>
        <p>A faculty member has submitted a formal attendance override request for an expired or locked lecture session:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 6px; color: #64748b;"><strong>Instructor:</strong></td><td style="padding: 6px;">${teacherName}</td></tr>
          <tr><td style="padding: 6px; color: #64748b;"><strong>Course:</strong></td><td style="padding: 6px;">${courseCode} — ${courseTitle}</td></tr>
          <tr><td style="padding: 6px; color: #64748b;"><strong>Section:</strong></td><td style="padding: 6px;">${sectionName}</td></tr>
          <tr><td style="padding: 6px; color: #64748b;"><strong>Time of Request:</strong></td><td style="padding: 6px;">${new Date(requestedAt || Date.now()).toLocaleString()}</td></tr>
          <tr><td style="padding: 6px; color: #64748b;"><strong>Stated Reason:</strong></td><td style="padding: 6px; color: #b45309;"><em>"${reason}"</em></td></tr>
        </table>

        <p>Please log in to your HOD Management Portal to review and approve or reject this request.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">This is an automated system notification from the UOS Academic Network Perimeter Portal.</p>
      </div>
    `;

    return this.sendMail({
      to: hodEmail,
      subject,
      html,
    });
  }

  /**
   * Send notification to Teacher when HOD makes a decision (Approved / Rejected)
   */
  async notifyTeacherOfDecision({ teacherEmail, teacherName, courseCode, sectionName, status, reviewNotes, hodName }) {
    const isApproved = status === 'APPROVED';
    const subject = `[Decision: ${status}] Attendance Unlock Request for ${courseCode} (${sectionName})`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: ${isApproved ? '#047857' : '#be123c'};">UOS Attendance Portal — Request Update</h2>
        <p>Dear <strong>${teacherName}</strong>,</p>
        <p>Your request to unlock attendance for <strong>${courseCode} (${sectionName})</strong> has been <strong>${status}</strong> by your Head of Department (${hodName || 'HOD'}).</p>
        
        ${isApproved ? `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 15px 0;">
            <p style="color: #065f46; margin: 0; font-weight: bold;">Session Unlocked:</p>
            <p style="color: #047857; margin: 5px 0 0 0; font-size: 13px;">You can now log in and mark student attendance for this lecture slot immediately.</p>
          </div>
        ` : `
          <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px; margin: 15px 0;">
            <p style="color: #881337; margin: 0; font-weight: bold;">Request Rejected:</p>
            <p style="color: #9f1239; margin: 5px 0 0 0; font-size: 13px;">The session remains locked as per university attendance regulations.</p>
          </div>
        `}

        ${reviewNotes ? `<p style="font-size: 13px;"><strong>HOD Feedback/Notes:</strong> <em>"${reviewNotes}"</em></p>` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">UOS Academic Attendance Management System • Automated Notice</p>
      </div>
    `;

    return this.sendMail({
      to: teacherEmail,
      subject,
      html,
    });
  }

  /**
   * Internal send method with development mock fallback
   */
  async sendMail({ to, subject, html }) {
    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || '"University of Sahiwal Attendance" <noreply@uosahiwal.edu.pk>',
          to,
          subject,
          html,
        });
        console.log(`[Email Service] Sent email to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.error('[Email Service] Failed to send email via SMTP:', err.message);
        return { success: false, error: err.message };
      }
    } else {
      // Safe Development Simulation Logging
      console.log('---------------------------------------------------------');
      console.log(`[Email Dispatcher (Dev Simulation)]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Date: ${new Date().toISOString()}`);
      console.log('---------------------------------------------------------');
      return { success: true, simulated: true };
    }
  }
}

export const emailService = new EmailService();
export default emailService;
