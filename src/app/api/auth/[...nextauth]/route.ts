import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// Environment variable validation and logging
console.log("[AUTH] Initializing NextAuth configuration...");
console.log("[AUTH] Checking environment variables...");

const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_CONVEX_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("[AUTH] Missing required environment variables:", missingVars);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

console.log("[AUTH] All required environment variables are present");
console.log("[AUTH] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Missing");
console.log("[AUTH] GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✓ Set" : "✗ Missing");
console.log("[AUTH] NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✓ Set" : "✗ Missing");
console.log("[AUTH] NEXT_PUBLIC_CONVEX_URL:", process.env.NEXT_PUBLIC_CONVEX_URL ? "✓ Set" : "✗ Missing");

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
console.log("[AUTH] Convex client initialized successfully");

// Create handler with logging
const createHandler = () => {
  console.error("[AUTH] 🚀 NextAuth handler created at:", new Date().toISOString());

  return NextAuth({
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
      console.error("[AUTH] 🔐 signIn callback triggered at:", new Date().toISOString());
      console.error("[AUTH] Account provider:", account?.provider);
      console.error("[AUTH] Account type:", account?.type);
      console.error("[AUTH] Account providerAccountId:", account?.providerAccountId);
      console.error("[AUTH] User email:", user?.email);
      console.error("[AUTH] User name:", user?.name);
      console.error("[AUTH] User image:", user?.image ? "Present" : "Not present");

      if (account?.provider === "google" && user.email) {
        console.error("[AUTH] Processing Google OAuth sign-in for user:", user.email);

        try {
          console.error("[AUTH] Attempting to upsert user to Convex...");
          const upsertData = {
            email: user.email,
            name: user.name || "",
            image: user.image || undefined,
            googleId: account.providerAccountId,
          };
          console.error("[AUTH] Upsert data:", JSON.stringify(upsertData, null, 2));

          await convex.mutation(api.users.upsertUser, upsertData);
          console.error("[AUTH] ✓ User upsert successful");

          console.error("[AUTH] Attempting to initialize queue settings...");
          await convex.mutation(api.queue.initializeQueueSettings, {
            updatedBy: user.email,
          });
          console.error("[AUTH] ✓ Queue settings initialization successful");

          console.error("[AUTH] ✓ Google OAuth sign-in completed successfully");
          return true;
        } catch (error) {
          console.error("[AUTH] ✗ Error during Google OAuth processing:", error);
          console.error("[AUTH] ✗ Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
          });

          // Log additional context
          if (error instanceof Error) {
            console.error("[AUTH] ✗ Error name:", error.name);
            console.error("[AUTH] ✗ Error message:", error.message);
            console.error("[AUTH] ✗ Error stack:", error.stack);
          }

          return false;
        }
      } else {
        console.error("[AUTH] Non-Google provider or no email provided, allowing sign-in");
        return true;
      }
    },
    async redirect({ url, baseUrl }) {
      console.error("[AUTH] 🔀 redirect callback triggered at:", new Date().toISOString());
      console.error("[AUTH] Original URL:", url);
      console.error("[AUTH] Base URL:", baseUrl);

      try {
        // If url is relative, resolve it relative to baseUrl
        if (url.startsWith("/")) {
          const resolvedUrl = `${baseUrl}${url}`;
          console.error("[AUTH] ✓ Resolved relative URL to:", resolvedUrl);
          return resolvedUrl;
        }

        // If url is on the same origin as baseUrl, allow it
        const urlOrigin = new URL(url).origin;
        console.error("[AUTH] URL origin:", urlOrigin);
        console.error("[AUTH] Base URL origin:", baseUrl);

        if (urlOrigin === baseUrl) {
          console.error("[AUTH] ✓ URL is on same origin, allowing redirect");
          return url;
        }

        // Otherwise, redirect to baseUrl
        console.error("[AUTH] ⚠ URL is from different origin, redirecting to base URL:", baseUrl);
        return baseUrl;
      } catch (error) {
        console.error("[AUTH] ✗ Error in redirect callback:", error);
        console.error("[AUTH] ✗ Falling back to base URL:", baseUrl);
        return baseUrl;
      }
    },
    async session({ session, token }) {
      console.error("[AUTH] 👤 session callback triggered at:", new Date().toISOString());
      console.error("[AUTH] Session user email:", session?.user?.email);
      console.error("[AUTH] Token sub:", token?.sub);
      console.error("[AUTH] Token provider:", token?.provider);

      try {
        if (session.user && token.sub) {
          (session.user as { id?: string }).id = token.sub;
          console.error("[AUTH] ✓ Added user ID to session:", token.sub);
        } else {
          console.error("[AUTH] ⚠ No session.user or token.sub found, session not modified");
        }

        console.error("[AUTH] ✓ Session callback completed successfully");
        return session;
      } catch (error) {
        console.error("[AUTH] ✗ Error in session callback:", error);
        console.error("[AUTH] ✗ Returning original session");
        return session;
      }
    },
  },
  pages: {
    signIn: "/",
  },
  });
};

const handler = createHandler();

export { handler as GET, handler as POST };
