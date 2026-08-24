import { PrismaClient } from '@prisma/client';

// One client for the whole process; --watch reuses it via globalThis in dev.
const g = globalThis;
export const prisma = g.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__prisma = prisma;
