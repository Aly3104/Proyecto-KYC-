/**
 * Better Auth singleton instance.
 *
 * This module is intentionally created outside of NestJS DI so that the same
 * auth object can be shared between the HTTP handler (AuthController) and the
 * session validation guard (AuthGuard) without circular dependencies.
 *
 * The PrismaClient used here is separate from the one injected into services;
 * this is the standard pattern recommended by the Better Auth documentation
 * for framework integrations.
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  // Mount all auth endpoints under /auth (matches the NestJS controller prefix)
  basePath: '/auth',

  database: prismaAdapter(prisma, {
    provider: 'sqlserver',
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'analista',
        // Expose as an input field so the role can be set at sign-up time
        // (useful for creating the first admin user via a seeding script or
        // a restricted sign-up form).
        input: true,
      },
    },
  },

  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],

  secret: process.env.BETTER_AUTH_SECRET ?? 'change-me-in-production',

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
});

// Type helpers re-exported for use in guards and decorators
export type Auth = typeof auth;
export type ActiveUser = typeof auth.$Infer.Session.user;
export type ActiveSession = typeof auth.$Infer.Session.session;
