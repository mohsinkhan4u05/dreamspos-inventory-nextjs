import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOTP, calculateOTPExpiry, hashOTP } from "@/lib/otp";
import {
  generateOTPEmailHTML,
  generateOTPEmailText,
} from "@/lib/email/otp-template";
import { sendEmail } from "@/lib/email/send-email";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json().catch(() => null);
    const currentPassword = body?.currentPassword as string | undefined;

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const bcrypt = await import("bcryptjs");
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    await prisma.passwordUpdateOTP.deleteMany({
      where: {
        userId,
        adminId: userId,
        verified: false,
      },
    });

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = calculateOTPExpiry();

    await prisma.passwordUpdateOTP.create({
      data: {
        userId,
        adminId: userId,
        otpHash,
        expiresAt,
        verified: false,
      },
    });

    const orgName = process.env.ORGANIZATION_NAME || "Bawarchi Masala";
    const userName =
      (user.firstName || user.lastName
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.email) || "User";

    const emailData = {
      recipientName: userName,
      recipientEmail: user.email,
      otp,
      targetUserName: userName,
      targetUserEmail: user.email,
      organizationName: orgName,
      expiryMinutes: 10,
    };

    try {
      await sendEmail({
        to: user.email,
        subject: `Password Change Verification - ${orgName}`,
        html: generateOTPEmailHTML(emailData),
        text: generateOTPEmailText(emailData),
      });
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent to your email (${user.email})`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error requesting profile password OTP:", error);
    return NextResponse.json(
      { error: "Failed to request OTP" },
      { status: 500 },
    );
  }
}
