"use client";

import { ConvexProvider } from "convex/react";
import { ReactNode } from "react";
import convex from "@/lib/convex";

interface ConvexProviderWrapperProps {
  children: ReactNode;
}

export default function ConvexProviderWrapper({
  children,
}: ConvexProviderWrapperProps) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
