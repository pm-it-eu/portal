import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: string
      companyId?: string
      company?: {
        id: string
        name: string
        email: string
      }
    }
  }

  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    companyId?: string
    company?: {
      id: string
      name: string
      email: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    companyId?: string
    firstName: string
    lastName: string
    company?: {
      id: string
      name: string
      email: string
    }
  }
}
