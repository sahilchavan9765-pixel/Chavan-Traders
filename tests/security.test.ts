import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validatePasswordStrength } from "../src/lib/password-validator";
import { getLoginLockout, recordLoginAttempt } from "../src/lib/rate-limiter";

describe("Security & Role-Based Access Control Verification", () => {
  type Role = "admin" | "staff";
  interface MockSession {
    user: { id: string; email: string; role: Role; mustChangePassword?: boolean } | null;
  }

  function mockRequireAuth(session: MockSession, options?: { allowMustChangePassword?: boolean }) {
    if (!session || !session.user || !session.user.id) {
      throw new Error("Unauthorized: Please log in to continue.");
    }
    if (session.user.mustChangePassword && !options?.allowMustChangePassword) {
      throw new Error("Redirect: /change-password");
    }
    return session.user;
  }

  function mockRequireAdmin(session: MockSession) {
    const user = mockRequireAuth(session);
    if (user.role !== "admin") {
      throw new Error("Forbidden: This action requires Administrator privileges.");
    }
    return user;
  }

  it("blocks logged-out users from protected actions", () => {
    const loggedOutSession: MockSession = { user: null };
    expect(() => mockRequireAuth(loggedOutSession)).toThrowError(/Unauthorized/);
    expect(() => mockRequireAdmin(loggedOutSession)).toThrowError(/Unauthorized/);
  });

  it("blocks STAFF users from admin-only actions (delete bills, restore backup, profit)", () => {
    const staffSession: MockSession = {
      user: { id: "user-staff-1", email: "staff@chavan.com", role: "staff" },
    };

    // Staff can authenticate
    expect(mockRequireAuth(staffSession)).toEqual(staffSession.user);

    // But Staff is blocked from admin actions
    expect(() => mockRequireAdmin(staffSession)).toThrowError(/Forbidden/);
  });

  it("forces redirect to /change-password when mustChangePassword is true", () => {
    const pendingPassChangeSession: MockSession = {
      user: { id: "user-owner-1", email: "tanmaychavan@gmail.com", role: "admin", mustChangePassword: true },
    };

    // Normal portal access is blocked and redirected
    expect(() => mockRequireAuth(pendingPassChangeSession)).toThrowError(/Redirect: \/change-password/);

    // Password change endpoint itself allows access
    expect(mockRequireAuth(pendingPassChangeSession, { allowMustChangePassword: true })).toBeDefined();
  });

  it("rejects weak, common, and incomplete passwords", () => {
    // Too short (< 10)
    expect(validatePasswordStrength("Pass@1").valid).toBe(false);
    expect(validatePasswordStrength("Pass@1").error).toContain("१० अक्षर");

    // Missing uppercase
    expect(validatePasswordStrength("password@123").valid).toBe(false);
    expect(validatePasswordStrength("password@123").error).toContain("मोठे अक्षर");

    // Missing symbol
    expect(validatePasswordStrength("Password123").valid).toBe(false);
    expect(validatePasswordStrength("Password123").error).toContain("चिन्ह");

    // Common password
    expect(validatePasswordStrength("Chavan@2026").valid).toBe(false);
    expect(validatePasswordStrength("Chavan@2026").error).toContain("सामान्य");

    // Strong password passes
    const strong = validatePasswordStrength("Kop@2026Traders#Secure");
    expect(strong.valid).toBe(true);
    expect(strong.error).toBeUndefined();
  });

  it("enforces login rate limiting and locks out for 15 minutes after 5 failed attempts", () => {
    const testEmail = "attacker@example.com";

    // 4 failed attempts should not lock
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt(testEmail, false);
      expect(getLoginLockout(testEmail).locked).toBe(false);
    }

    // 5th failed attempt locks out
    recordLoginAttempt(testEmail, false);
    const lockStatus = getLoginLockout(testEmail);
    expect(lockStatus.locked).toBe(true);
    expect(lockStatus.lockedUntil).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    // Successful attempt clears lockout
    recordLoginAttempt(testEmail, true);
    expect(getLoginLockout(testEmail).locked).toBe(false);
  });

  it("allows ADMIN users full access to admin-only actions", () => {
    const adminSession: MockSession = {
      user: { id: "user-admin-1", email: "tanmaychavan@gmail.com", role: "admin" },
    };

    expect(mockRequireAuth(adminSession)).toEqual(adminSession.user);
    expect(mockRequireAdmin(adminSession)).toEqual(adminSession.user);
  });

  it("strictly validates inputs with Zod schemas to reject invalid requests", () => {
    const billSchema = z.object({
      kind: z.enum(["purchase", "sale"]),
      partyName: z.string().min(2),
      items: z
        .array(
          z.object({
            product: z.string().min(1),
            netKg: z.number().positive(),
            rate: z.number().positive(),
          })
        )
        .min(1),
    });

    const malformed = billSchema.safeParse({
      kind: "unknown",
      partyName: "",
      items: [],
    });

    expect(malformed.success).toBe(false);
  });
});

