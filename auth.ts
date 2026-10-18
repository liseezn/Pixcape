import 'server-only'
import type { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET

const providers = process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  ? [GitHubProvider({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET })]
  : []

export const authOptions: NextAuthOptions = {
  // The runtime-selected Prisma client is generated into provider-specific output directories.
  // Those generated types are structurally compatible with the adapter's schema contract,
  // but TypeScript treats their duplicated generic transaction types as distinct.
  // Keep the cast scoped to this adapter boundary; application queries remain strongly typed.
  adapter: PrismaAdapter(prisma as never),
  providers,
  secret: authSecret,
  session: { strategy: 'database', maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  useSecureCookies: process.env.NODE_ENV === 'production',
  pages: { signIn: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
        session.user.status = user.status
      }
      return session
    },
    async signIn({ user }) {
      if (!user.id) return false
      const record = await prisma.user.findUnique({ where: { id: user.id }, select: { status: true } })
      return record?.status === 'ACTIVE'
    },
  },
}
