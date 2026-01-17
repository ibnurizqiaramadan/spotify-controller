"use client";

import { ReactNode } from "react";
import { GoogleAuthProvider } from "./google-auth-provider";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider>{children}</GoogleAuthProvider>;
}
