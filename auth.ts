import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

const providers = process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  ? [GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET })]
  : []

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // role is read from the database-backed adapter user, never from client input.
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
})
