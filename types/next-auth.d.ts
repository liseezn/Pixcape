import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'USER' | 'CREATOR' | 'ADMIN'
      status: 'ACTIVE' | 'SUSPENDED' | 'DELETED'
    } & NonNullable<DefaultSession['user']>
  }

  interface User {
    role: 'USER' | 'CREATOR' | 'ADMIN'
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'USER' | 'CREATOR' | 'ADMIN'
  }
}
