import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getLoginLockout, recordLoginAttempt } from "@/lib/rate-limiter";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const cleanEmail = email.toLowerCase().trim();

        // 1. Check Rate-Limiting Lockout
        const lock = getLoginLockout(cleanEmail);
        if (lock.locked) {
          console.warn(`Login rejected: Account ${cleanEmail} is locked until ${new Date(lock.lockedUntil!).toISOString()}`);
          return null;
        }

        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

          if (!user || !user.isActive) {
            recordLoginAttempt(cleanEmail, false);
            return null;
          }

          const isMatch = await bcrypt.compare(password, user.passwordHash);

          if (!isMatch) {
            recordLoginAttempt(cleanEmail, false);
            return null;
          }

          // Reset failed attempts on success
          recordLoginAttempt(cleanEmail, true);

          // Determine display name
          let displayName = user.fullName;
          if (!displayName) {
            if (cleanEmail.includes("tanmay")) {
              displayName = "Tanmay Chavan";
            } else if (cleanEmail.includes("sahil")) {
              displayName = "Sahil Chavan";
            } else {
              displayName = user.role === "admin" ? "Admin" : "Staff";
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: displayName,
            role: user.role,
            mustChangePassword: !!user.mustChangePassword,
          };
        } catch (err) {
          console.error("Authorize database query error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as { role?: string }).role;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.name) {
          session.user.name = token.name as string;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
});
