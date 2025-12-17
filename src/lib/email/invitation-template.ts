/**
 * Zoho-style Invitation Email Template
 */

interface InvitationEmailData {
  recipientName: string;
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  invitationUrl: string;
  expiryDays: number;
}

export function generateInvitationEmailHTML(data: InvitationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${data.organizationName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #ffffff;
      padding: 30px 40px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .logo {
      width: 120px;
      height: auto;
      margin-bottom: 20px;
    }
    .content {
      padding: 40px;
      color: #374151;
      line-height: 1.6;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .message {
      font-size: 15px;
      margin-bottom: 30px;
      color: #4b5563;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #10b981;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #059669;
    }
    .expiry-notice {
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
      margin-top: 20px;
    }
    .help-text {
      font-size: 14px;
      color: #6b7280;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
    }
    .help-link {
      color: #3b82f6;
      text-decoration: none;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px 40px;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer-signature {
      margin-bottom: 15px;
      color: #374151;
    }
    .footer-link {
      color: #3b82f6;
      text-decoration: none;
    }
    .footer-disclaimer {
      margin-top: 20px;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div style="color: #6366f1; font-size: 28px; font-weight: 700;">
        ${data.organizationName}
      </div>
    </div>
    
    <div class="content">
      <div class="greeting">Hi ${data.recipientName},</div>
      
      <div class="message">
        You have been invited by <strong>${data.inviterName}</strong> to join the <strong>${data.organizationName}</strong> organization.
        Click below to either accept or reject the invitation.
      </div>
      
      <div style="text-align: center;">
        <a href="${data.invitationUrl}" class="cta-button">View Invitation</a>
      </div>
      
      <div class="expiry-notice">
        This invitation will expire in ${data.expiryDays} days.
      </div>
      
      <div class="help-text">
        If you have any trouble accepting the invitation or if you think that you've received this email by mistake, 
        please contact <a href="mailto:support@${data.organizationName.toLowerCase().replace(/\s+/g, '')}.com" class="help-link">support@${data.organizationName.toLowerCase().replace(/\s+/g, '')}.com</a>.
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-signature">
        Regards,<br>
        <strong>The ${data.organizationName} Team</strong>
      </div>
      
      <div class="footer-disclaimer">
        This e-mail is generated from ${data.organizationName}. If you think this is SPAM, please report it for immediate action.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateInvitationEmailText(data: InvitationEmailData): string {
  return `
Hi ${data.recipientName},

You have been invited by ${data.inviterName} to join the ${data.organizationName} organization.

To accept or reject this invitation, please visit:
${data.invitationUrl}

This invitation will expire in ${data.expiryDays} days.

If you have any trouble accepting the invitation or if you think that you've received this email by mistake, please contact support@${data.organizationName.toLowerCase().replace(/\s+/g, '')}.com.

Regards,
The ${data.organizationName} Team
  `.trim();
}
