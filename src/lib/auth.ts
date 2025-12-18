import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials: Record<"email" | "password", string> | undefined,
        _req?: any,
      ) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            customRole: true,
          },
        })

        if (!user) {
          return null
        }

        // If there is no stored password hash, treat as invalid credentials
        if (!user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        )

        if (!isPasswordValid) {
          return null
        }

        const safeUsername = user.username || user.email;

        const authUser = {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim() || safeUsername,
          username: safeUsername,
          role: user.role,
          roleId: user.roleId,
          customRoleName: user.customRole?.displayName ?? null,
        } as any;

        return authUser
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        // Preserve enum role (e.g. SUPER_ADMIN) for RBAC checks
        token.role = user.role
        token.roleId = user.roleId || null
        // Expose custom role display name separately for UI
        token.roleName = user.customRoleName || null
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.roleId = (token.roleId as string | null) ?? null
        session.user.roleName = (token.roleName as string | null) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
