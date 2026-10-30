import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Cria o cliente Prisma:
 * - Com TURSO_DATABASE_URL + TURSO_AUTH_TOKEN definidos → banco Turso na nuvem (produção/Vercel)
 * - Sem eles → arquivo SQLite local (desenvolvimento sem credenciais)
 */
export function criarPrisma(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (url && token) {
    const adapter = new PrismaLibSQL({ url, authToken: token })
    return new PrismaClient({ adapter })
  }
  return new PrismaClient({ log: ['query'] })
}

export const db = globalForPrisma.prisma ?? criarPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
