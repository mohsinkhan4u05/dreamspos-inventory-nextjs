import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import { verifyOTP, isOTPExpired } from "@/lib/otp";
import bcrypt from "bcryptjs";

/**
 * POST /api/users/[id]/password/update
 * Verify OTP and update user password (SUPER_ADMIN only)
 */
export const POST = withPermission(
  "users",
  "update",
  async (request, adminUser, { params }) => {
    try {
      const userId = params.id;
      const body = await request.json();
      const { otp, newPassword } = body;

      // Validation
      if (!otp || !newPassword) {
        return NextResponse.json(
          { error: "OTP and new password are required" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long" },
          { status: 400 }
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

      // Find the most recent unverified OTP for this user
      const otpRecord = await prisma.passwordUpdateOTP.findFirst({
        where: {
          userId: userId,
          adminId: adminUser.id,
          verified: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!otpRecord) {
        return NextResponse.json(
          { error: "No OTP request found. Please request a new OTP." },
          { status: 400 }
        );
      }

      // Check if OTP has expired
      if (isOTPExpired(otpRecord.expiresAt)) {
        // Delete expired OTP
        await prisma.passwordUpdateOTP.delete({
          where: { id: otpRecord.id },
        });

        return NextResponse.json(
          { error: "OTP has expired. Please request a new one." },
          { status: 400 }
        );
      }

      // Verify OTP
      if (!verifyOTP(otp, otpRecord.otpHash)) {
        return NextResponse.json(
          { error: "Invalid OTP. Please check and try again." },
          { status: 400 }
        );
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      });

      // Mark OTP as verified
      await prisma.passwordUpdateOTP.update({
        where: { id: otpRecord.id },
        data: {
          verified: true,
        },
      });

      // Delete all other unverified OTPs for this user
      await prisma.passwordUpdateOTP.deleteMany({
        where: {
          userId: userId,
          verified: false,
          id: {
            not: otpRecord.id,
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: "PASSWORD_UPDATE",
          resource: "USER",
          resourceId: userId,
          description: `Super Admin updated password for user ${user.email}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }
  }
);
