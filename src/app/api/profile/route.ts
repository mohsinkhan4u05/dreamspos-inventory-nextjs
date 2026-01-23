import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const firstName =
    typeof body.firstName === "string" ? body.firstName : undefined;
  const lastName =
    typeof body.lastName === "string" ? body.lastName : undefined;
  const phone = typeof body.phone === "string" ? body.phone : undefined;
  const avatar =
    typeof body.avatar === "string" || body.avatar === null
      ? body.avatar
      : undefined;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(avatar !== undefined ? { avatar } : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}
