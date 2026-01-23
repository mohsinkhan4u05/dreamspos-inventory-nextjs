import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import { generateOTP, calculateOTPExpiry, hashOTP } from "@/lib/otp";
import {
  generateOTPEmailHTML,
  generateOTPEmailText,
} from "@/lib/email/otp-template";
import { sendEmail } from "@/lib/email/send-email";

/**
 * POST /api/users/[id]/password/request-otp
 * Request OTP for password update (SUPER_ADMIN only)
 */
export const POST = withPermission(
  "users",
  "update",
  async (request, adminUser, { params }) => {
    try {
      const userId = params.id;

      // Verify the user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Only SUPER_ADMIN can update passwords
      if (adminUser.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Only Super Admin can update user passwords" },
          { status: 403 }
        );
      }

      // Prevent Super Admin from changing their own password through this method
      if (userId === adminUser.id) {
        return NextResponse.json(
          { error: "Use profile settings to change your own password" },
          { status: 400 }
        );
      }

      // Invalidate any existing unverified OTPs for this user
      await prisma.passwordUpdateOTP.deleteMany({
        where: {
          userId: userId,
          verified: false,
        },
      });

      // Generate OTP
      const otp = generateOTP();
      const otpHash = hashOTP(otp);
      const expiresAt = calculateOTPExpiry();

      // Store OTP in database
      await prisma.passwordUpdateOTP.create({
        data: {
          userId: userId,
          adminId: adminUser.id,
          otpHash: otpHash,
          expiresAt: expiresAt,
          verified: false,
        },
      });

      // Get admin details from database
      const admin = await prisma.user.findUnique({
        where: { id: adminUser.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!admin) {
        return NextResponse.json(
          { error: "Admin user not found" },
          { status: 404 }
        );
      }

      // Get organization name
      const orgName = process.env.ORGANIZATION_NAME || "DreamsPOS";

      // Prepare email data - OTP sent to Super Admin
      const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email;
      const targetUserName = user.firstName || user.lastName 
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.email;

      const emailData = {
        recipientName: adminName,
        recipientEmail: admin.email,
        otp,
        targetUserName,
        targetUserEmail: user.email,
        organizationName: orgName,
        expiryMinutes: 10,
      };

      // Send OTP email to Super Admin
      try {
        await sendEmail({
          to: admin.email,
          subject: `Password Update Verification - ${orgName}`,
          html: generateOTPEmailHTML(emailData),
          text: generateOTPEmailText(emailData),
        });
      } catch (emailError) {
        console.error("Failed to send OTP email:", emailError);
        return NextResponse.json(
          { error: "Failed to send OTP email. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `OTP sent to your email (${admin.email})`,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Error requesting OTP:", error);
      return NextResponse.json(
        { error: "Failed to request OTP" },
        { status: 500 }
      );
    }
  }
);
