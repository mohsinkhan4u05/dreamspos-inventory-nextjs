import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOTP, isOTPExpired } from "@/lib/otp";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { otp, newPassword } = body as {
      otp?: string;
      newPassword?: string;
    };

    if (!otp || !newPassword) {
      return NextResponse.json(
        { error: "OTP and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const otpRecord = await prisma.passwordUpdateOTP.findFirst({
      where: {
        userId,
        adminId: userId,
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No OTP request found. Please request a new OTP." },
        { status: 400 },
      );
    }

    if (isOTPExpired(otpRecord.expiresAt)) {
      await prisma.passwordUpdateOTP.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (!verifyOTP(otp, otpRecord.otpHash)) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordUpdateOTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    await prisma.passwordUpdateOTP.deleteMany({
      where: {
        userId,
        verified: false,
        id: { not: otpRecord.id },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile password:", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 },
    );
  }
}
