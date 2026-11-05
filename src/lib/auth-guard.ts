import { auth } from "@/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "staff";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

/**
 * Ensures user is authenticated. Redirects to /login if logged out.
 * Enforces mandatory password change redirection if mustChangePassword is true.
 */
export async function requireAuth(options?: { allowMustChangePassword?: boolean }): Promise<SessionUser> {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;

  if (user.mustChangePassword && !options?.allowMustChangePassword) {
    redirect("/change-password");
  }

  return {
    id: user.id,
    email: user.email || "",
    name: user.name || "",
    role: (user.role as UserRole) || "staff",
    mustChangePassword: !!user.mustChangePassword,
  };
}

/**
 * Ensures user is authenticated AND has ADMIN role. Throws if staff or logged out.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden: This action requires Administrator privileges.");
  }
  return user;
}

/**
 * Log administrative and financial audit actions
 */
export async function logAudit(
  user: SessionUser,
  action: string,
  entity: string,
  entityId: string = "",
  details: Record<string, unknown> = {}
) {
  try {
    await db.insert(auditLogs).values({
      userId: user.id,
      userEmail: user.email,
      action,
      entity,
      entityId,
      details,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}

