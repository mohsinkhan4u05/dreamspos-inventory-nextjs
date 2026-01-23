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
          // Role information comes from the Role model, not the legacy enum
          roleId: user.roleId,
          roleKey: user.customRole?.name ?? null,
          roleName: user.customRole?.displayName ?? null,
          avatar: user.avatar ?? null,
        } as any;

        return authUser
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      // On initial sign-in, seed token from the authenticated user
      if (user) {
        token.roleKey = user.roleKey || null
        token.roleId = user.roleId || null
        token.roleName = user.roleName || null
        token.avatar = user.avatar ?? null
      }

      // When the client calls useSession().update(), refresh avatar (and role info)
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { customRole: true },
        })

        if (dbUser) {
          token.roleKey = dbUser.customRole?.name ?? null
          token.roleId = dbUser.roleId || null
          token.roleName = dbUser.customRole?.displayName ?? null
          token.avatar = dbUser.avatar ?? null
        }
      }

      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub!
        // New canonical fields
        session.user.roleKey = (token.roleKey as string | null) ?? null
        session.user.roleId = (token.roleId as string | null) ?? null
        session.user.roleName = (token.roleName as string | null) ?? null
        session.user.image = (token.avatar as string | null) ?? null

        // Backward-compatible alias: many places may still read session.user.role
        session.user.role = session.user.roleKey
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
