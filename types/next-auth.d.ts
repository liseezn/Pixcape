import 'next-auth'
import type { DefaultSession } from 'next-auth'

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
