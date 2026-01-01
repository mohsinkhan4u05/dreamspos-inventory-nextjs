import crypto from "crypto";

/**
 * OTP Configuration
 */
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

/**
 * Generate a secure 6-digit OTP
 */
export function generateOTP(): string {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
}

/**
 * Calculate OTP expiry date (10 minutes from now)
 */
export function calculateOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
}

/**
 * Hash OTP for secure storage
 */
export function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Verify OTP against stored hash
 */
export function verifyOTP(otp: string, hashedOTP: string): boolean {
  const inputHash = hashOTP(otp);
  return inputHash === hashedOTP;
}

/**
 * Check if OTP has expired
 */
export function isOTPExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}
