"use client";

import React, { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth-guard";

interface UserContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  userRole: string;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isAdmin: false,
  userRole: "staff",
});

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        userRole: user?.role || "staff",
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

