/**
 * OTP Email Template for Password Update Verification
 */

interface OTPEmailData {
  recipientName: string;
  recipientEmail: string;
  otp: string;
  adminName: string;
  organizationName: string;
  expiryMinutes: number;
}

export function generateOTPEmailHTML(data: OTPEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Update Verification</title>
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .header-title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
    }
    .content {
      padding: 40px;
      color: #374151;
      line-height: 1.6;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .message {
      font-size: 15px;
      margin-bottom: 30px;
      color: #4b5563;
    }
    .otp-container {
      background-color: #f9fafb;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
    }
    .otp-expiry {
      font-size: 13px;
      color: #ef4444;
      margin-top: 15px;
      font-weight: 500;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-text {
      font-size: 14px;
      color: #92400e;
      margin: 0;
    }
    .security-notice {
      font-size: 13px;
      color: #6b7280;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
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
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="header-title">${data.organizationName}</div>
    </div>
    
    <div class="content">
      <div class="greeting">Hi ${data.recipientName},</div>
      
      <div class="message">
        A Super Admin (<strong>${data.adminName}</strong>) has requested to update your password. 
        To verify this action, please use the One-Time Password (OTP) below:
      </div>
      
      <div class="otp-container">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">${data.otp}</div>
        <div class="otp-expiry">⏱ Expires in ${data.expiryMinutes} minutes</div>
      </div>
      
      <div class="warning-box">
        <p class="warning-text">
          <strong>⚠️ Security Alert:</strong> If you did not request this password change, 
          please contact your administrator immediately and do not share this code with anyone.
        </p>
      </div>
      
      <div class="security-notice">
        <strong>Security Tips:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Never share your OTP with anyone</li>
          <li>This code is valid for ${data.expiryMinutes} minutes only</li>
          <li>If you didn't request this, contact support immediately</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-signature">
        Regards,<br>
        <strong>The ${data.organizationName} Security Team</strong>
      </div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 15px;">
        This is an automated security notification from ${data.organizationName}.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateOTPEmailText(data: OTPEmailData): string {
  return `
Hi ${data.recipientName},

A Super Admin (${data.adminName}) has requested to update your password.

Your Verification Code: ${data.otp}

This code will expire in ${data.expiryMinutes} minutes.

⚠️ SECURITY ALERT: If you did not request this password change, please contact your administrator immediately and do not share this code with anyone.

Security Tips:
- Never share your OTP with anyone
- This code is valid for ${data.expiryMinutes} minutes only
- If you didn't request this, contact support immediately

Regards,
The ${data.organizationName} Security Team
  `.trim();
}
