/**
 * Better Auth browser client.
 * Any client component that needs auth state imports from this file.
 */
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  basePath: '/auth',
});

export const { signIn, signOut, signUp, useSession } = authClient;
