import { DefaultSession } from "next-auth"
import { UserRole } from "@/generated/prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      username: string
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
    username: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    username: string
  }
}
