// In-memory Rate-limiting failed attempts tracker (5 attempts -> 15 min lock)
export interface LoginAttemptState {
  attempts: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptState>();

export function getLoginLockout(email: string): { locked: boolean; lockedUntil?: number } {
  const key = email.toLowerCase().trim();
  const state = loginAttempts.get(key);
  if (state?.lockedUntil && state.lockedUntil > Date.now()) {
    return { locked: true, lockedUntil: state.lockedUntil };
  }
  return { locked: false };
}

export function recordLoginAttempt(email: string, success: boolean): void {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  if (success) {
    loginAttempts.delete(key);
    return;
  }
  const state = loginAttempts.get(key) || { attempts: 0 };
  state.attempts += 1;
  if (state.attempts >= 5) {
    state.lockedUntil = now + 15 * 60 * 1000;
  }
  loginAttempts.set(key, state);
}

export function resetLoginAttempts(email?: string): void {
  if (email) {
    loginAttempts.delete(email.toLowerCase().trim());
  } else {
    loginAttempts.clear();
  }
}

