import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "next-auth/react";

export const useCurrentConvexUser = () => {
  const { data: session, status } = useSession();
  
  const user = useQuery(
    api.users.getUserByEmail,
    status === "authenticated" && session.user?.email 
      ? { email: session.user.email } 
      : "skip"
  );

  return {
    user,
    isLoading: status === "loading" || user === undefined,
    isAuthenticated: status === "authenticated",
    session,
  };
};
