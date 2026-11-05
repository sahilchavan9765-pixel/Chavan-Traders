/**
 * Password Policy Enforcement for Chavan Traders
 * - Minimum 10 characters
 * - Uppercase letter (A-Z)
 * - Lowercase letter (a-z)
 * - Number (0-9)
 * - Symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - Reject common or previous weak passwords
 */

const COMMON_DISALLOWED_PASSWORDS = new Set([
  "chavan@2026",
  "chavan@123",
  "chavantraders",
  "password123",
  "password@123",
  "admin@123",
  "1234567890",
  "12345678",
  "9765941078",
  "9850815527",
  "welcome123",
  "qwertyuiop",
]);

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    symbol: boolean;
    notCommon: boolean;
  };
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const p = password || "";
  const checks = {
    length: p.length >= 10,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number: /[0-9]/.test(p),
    symbol: /[^A-Za-z0-9]/.test(p),
    notCommon: !COMMON_DISALLOWED_PASSWORDS.has(p.toLowerCase().trim()),
  };

  if (!checks.length) {
    return { valid: false, error: "पासवर्ड किमान १० अक्षरांचा असावा (Minimum 10 characters)", checks };
  }
  if (!checks.uppercase) {
    return { valid: false, error: "किमान एक मोठे अक्षर (A-Z) आवश्यक आहे", checks };
  }
  if (!checks.lowercase) {
    return { valid: false, error: "किमान एक लहान अक्षर (a-z) आवश्यक आहे", checks };
  }
  if (!checks.number) {
    return { valid: false, error: "किमान एक अंक (0-9) आवश्यक आहे", checks };
  }
  if (!checks.symbol) {
    return { valid: false, error: "किमान एक चिन्ह (@, #, $, इ.) आवश्यक आहे", checks };
  }
  if (!checks.notCommon) {
    return { valid: false, error: "हा पासवर्ड सामान्य/असुरक्षित आहे, कृपया वेगळा निवडा", checks };
  }

  return { valid: true, checks };
}

