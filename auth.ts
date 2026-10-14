import 'server-only'
import type { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

const providers = process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  ? [GitHubProvider({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET })]
  : []

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
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
