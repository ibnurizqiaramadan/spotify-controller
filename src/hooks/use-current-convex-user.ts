import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGoogleAuth } from "@/providers/google-auth-provider";

export const useCurrentConvexUser = () => {
  const { user: googleUser, isLoading, isAuthenticated } = useGoogleAuth();

  const user = useQuery(
    api.users.getUserByEmail,
    isAuthenticated && googleUser?.email
      ? { email: googleUser.email }
      : "skip"
  );

  return {
    user,
    isLoading: isLoading || user === undefined,
    isAuthenticated,
    session: googleUser ? { user: googleUser } : null,
  };
};
