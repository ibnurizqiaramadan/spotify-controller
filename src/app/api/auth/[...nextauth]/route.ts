import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// Environment variable validation and logging
const logAuth = (message: string, data?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'auth',
    message,
    ...(data && { data })
  };
  console.log(JSON.stringify(logEntry));
};

const logAuthError = (message: string, error?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    service: 'auth',
    message,
    ...(error && { error: error.message || error })
  };
  console.error(JSON.stringify(logEntry));
};

logAuth("Initializing NextAuth configuration");
logAuth("Checking environment variables");

const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_CONVEX_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  logAuthError("Missing required environment variables", missingVars);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

logAuth("All required environment variables are present", {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Missing",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✓ Set" : "✗ Missing",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Set" : "✗ Missing",
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ? "✓ Set" : "✗ Missing",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "⚠ NOT SET - This may cause redirect issues!"
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
logAuth("Convex client initialized successfully");

// Create handler with logging
const createHandler = () => {
  logAuth("NextAuth handler created", { timestamp: new Date().toISOString() });

  // Log Google provider configuration (without secrets)
  logAuth("Google provider configuration", {
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...",
    secretSet: !!process.env.NEXTAUTH_SECRET
  });

  // Determine base URL - prioritize NEXTAUTH_URL, fallback to auto-detection
  const baseUrl = process.env.NEXTAUTH_URL || 'auto-detect';
  logAuth("NextAuth configuration", {
    baseUrl: baseUrl,
    debug: true,
    hasSecret: !!process.env.NEXTAUTH_SECRET
  });

  return NextAuth({
    debug: true, // Enable NextAuth debug mode
    secret: process.env.NEXTAUTH_SECRET,
    // Explicitly set base URL if provided
    ...(process.env.NEXTAUTH_URL && {
      basePath: '/api/auth',
      baseUrl: process.env.NEXTAUTH_URL
    }),
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
      logAuth("SignIn callback triggered", {
        provider: account?.provider,
        accountType: account?.type,
        providerAccountId: account?.providerAccountId,
        userEmail: user?.email,
        userName: user?.name,
        hasImage: !!user?.image,
        fullAccount: account,
        fullUser: user
      });

      if (account?.provider === "google" && user.email) {
        logAuth("Processing Google OAuth sign-in", { email: user.email });

        try {
          logAuth("Attempting to upsert user to Convex");
          const upsertData = {
            email: user.email,
            name: user.name || "",
            image: user.image || undefined,
            googleId: account.providerAccountId,
          };

          await convex.mutation(api.users.upsertUser, upsertData);
          logAuth("User upsert successful");

          logAuth("Attempting to initialize queue settings");
          await convex.mutation(api.queue.initializeQueueSettings, {
            updatedBy: user.email,
          });
          logAuth("Queue settings initialization successful");

          logAuth("Google OAuth sign-in completed successfully");
          return true;
        } catch (error) {
          logAuthError("Error during Google OAuth processing", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
          });
          return false;
        }
      } else {
        logAuth("Non-Google provider or no email provided, allowing sign-in", {
          provider: account?.provider,
          hasEmail: !!user?.email
        });
        return true;
      }
    },
    async redirect({ url, baseUrl }) {
      logAuth("Redirect callback triggered", {
        originalUrl: url,
        baseUrl: baseUrl,
        nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
        urlIsRelative: url.startsWith("/"),
        urlOrigin: url.startsWith("/") ? null : new URL(url).origin
      });

      try {
        // If url is relative, resolve it relative to baseUrl
        if (url.startsWith("/")) {
          const resolvedUrl = `${baseUrl}${url}`;
          logAuth("Resolved relative URL", {
            originalUrl: url,
            baseUrl: baseUrl,
            resolvedUrl: resolvedUrl
          });
          return resolvedUrl;
        }

        // If url is on the same origin as baseUrl, allow it
        const urlOrigin = new URL(url).origin;
        const baseUrlOrigin = new URL(baseUrl).origin;
        
        logAuth("Checking URL origin", {
          urlOrigin: urlOrigin,
          baseUrlOrigin: baseUrlOrigin,
          originsMatch: urlOrigin === baseUrlOrigin
        });

        if (urlOrigin === baseUrlOrigin) {
          logAuth("URL is on same origin, allowing redirect", { finalUrl: url });
          return url;
        }

        // Otherwise, redirect to baseUrl
        logAuth("URL from different origin, redirecting to base URL", {
          urlOrigin: urlOrigin,
          baseUrlOrigin: baseUrlOrigin,
          finalUrl: baseUrl
        });
        return baseUrl;
      } catch (error) {
        logAuthError("Error in redirect callback", {
          error: error instanceof Error ? error.message : String(error),
          baseUrl: baseUrl,
          originalUrl: url
        });
        return baseUrl;
      }
    },
    async session({ session, token }) {
      logAuth("Session callback triggered", {
        userEmail: session?.user?.email,
        tokenSub: token?.sub,
        tokenProvider: token?.provider
      });

      try {
        if (session.user && token.sub) {
          (session.user as { id?: string }).id = token.sub;
          logAuth("Added user ID to session", { userId: token.sub });
        } else {
          logAuth("No session.user or token.sub found, session not modified");
        }

        logAuth("Session callback completed successfully");
        return session;
      } catch (error) {
        logAuthError("Error in session callback", error);
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

// Wrapper to log incoming requests
const loggedHandler = async (request: Request, context?: any) => {
  const requestUrl = new URL(request.url);
  const host = request.headers.get('host') || 'unknown';
  const origin = request.headers.get('origin') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  
  logAuth("Incoming auth request", {
    method: request.method,
    fullUrl: request.url,
    pathname: requestUrl.pathname,
    searchParams: Object.fromEntries(requestUrl.searchParams.entries()),
    host: host,
    origin: origin,
    referer: referer,
    protocol: requestUrl.protocol,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    expectedCallbackUrl: `${requestUrl.protocol}//${host}/api/auth/callback/google`
  });

  try {
    const result = await handler(request, context);
    logAuth("Auth request processed successfully");
    return result;
  } catch (error) {
    logAuthError("Auth request failed", error);
    throw error;
  }
};

export { loggedHandler as GET, loggedHandler as POST };
