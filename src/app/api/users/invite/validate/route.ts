import { NextRequest, NextResponse } from "next/server";
import { validateInvitationToken } from "@/lib/invitation-token";

// GET /api/users/invite/validate?token=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "Token is required" },
      { status: 400 }
    );
  }

  const result = await validateInvitationToken(token);

  if (!result.valid || !result.invitation) {
    return NextResponse.json(
      { valid: false, error: result.error || "Invalid invitation" },
      { status: 400 }
    );
  }

  const { invitation } = result;

  return NextResponse.json({
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: {
        displayName: invitation.role.displayName,
      },
    },
  });
}
