"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, requireAuth, logAudit } from "@/lib/auth-guard";
import { validatePasswordStrength } from "@/lib/password-validator";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getUsersAction() {
  await requireAdmin();

  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return userList;
}

export async function createStaffUserAction(
  email: string,
  fullName: string,
  temporaryPass: string
) {
  const admin = await requireAdmin();

  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required.");
  }
  if (!temporaryPass || temporaryPass.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(temporaryPass, salt);

  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      fullName: fullName.trim() || "Staff Member",
      passwordHash,
      role: "staff",
      isActive: true,
      mustChangePassword: true,
    })
    .returning();

  await logAudit(admin, "CREATE_STAFF", "users", newUser.id, { email });

  revalidatePath("/app/users");

  return { success: true, userId: newUser.id };
}

export async function toggleUserStatusAction(userId: string, isActive: boolean) {
  const admin = await requireAdmin();

  await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit(admin, "TOGGLE_USER_STATUS", "users", userId, { isActive });

  revalidatePath("/app/users");

  return { success: true };
}

export async function changePasswordAction(currentPass: string, newPass: string) {
  const sessionUser = await requireAuth({ allowMustChangePassword: true });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!user) {
    throw new Error("वापरकर्ता सापडला नाही (User not found).");
  }

  const isCurrentValid = await bcrypt.compare(currentPass, user.passwordHash);
  if (!isCurrentValid) {
    throw new Error("सध्याचा पासवर्ड चुकीचा आहे (Current password is incorrect).");
  }

  const strength = validatePasswordStrength(newPass);
  if (!strength.valid) {
    throw new Error(strength.error || "पासवर्ड नियमांनुसार नाही.");
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPass, salt);

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await logAudit(sessionUser, "CHANGE_PASSWORD", "users", user.id);

  return { success: true };
}

export async function adminResetPasswordAction(userId: string, tempPassword: string) {
  const admin = await requireAdmin();

  const strength = validatePasswordStrength(tempPassword);
  if (!strength.valid) {
    throw new Error(strength.error || "तात्पुरता पासवर्ड नियमांनुसार नाही.");
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(tempPassword, salt);

  await db
    .update(users)
    .set({
      passwordHash: hash,
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logAudit(admin, "RESET_PASSWORD", "users", userId);
  revalidatePath("/app/users");

  return { success: true };
}


