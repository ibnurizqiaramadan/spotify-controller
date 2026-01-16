import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Upsert user to Convex
          await convex.mutation(api.users.upsertUser, {
            email: user.email,
            name: user.name || "",
            image: user.image || undefined,
            googleId: account.providerAccountId,
          });
          
          // Initialize queue settings if not exists
          await convex.mutation(api.queue.initializeQueueSettings, {
            updatedBy: user.email,
          });
          
          return true;
        } catch (error) {
          console.error("Error saving user to Convex:", error);
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // If url is relative, resolve it relative to baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If url is on the same origin as baseUrl, allow it
      if (new URL(url).origin === baseUrl) return url;
      // Otherwise, redirect to baseUrl
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});

export { handler as GET, handler as POST };
