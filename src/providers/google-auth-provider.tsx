"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { logAuth, logAuthError } from '../utils/logger';
import { decodeGoogleJWT } from '../utils/jwt';

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: {
              credential: string;
              select_by: string;
            }) => void;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              type?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
            }
          ) => void;
        };
      };
    };
  }
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  loginButtonRef: React.RefObject<HTMLDivElement | null>;
  token: string | null;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logAuth("Initializing Google Auth Provider");

    const initGoogleAuth = () => {
      if (!window.google?.accounts?.id) {
        logAuthError("Google Identity Services not loaded");
        setIsLoading(false);
        return;
      }

      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        logAuthError("NEXT_PUBLIC_GOOGLE_CLIENT_ID not set");
        setIsLoading(false);
        return;
      }

      logAuth("Initializing Google Identity Services", {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 10) + "..."
      });

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          logAuth("Google OAuth callback received", {
            credentialLength: response.credential.length,
            selectBy: response.select_by
          });

          try {
            // Store JWT token in cookie
            setCookie('google_jwt', response.credential, 7); // 7 days expiry
            setToken(response.credential);

            // Decode the JWT token to get user info
            const googleUser = decodeGoogleJWT(response.credential);
            if (!googleUser) {
              throw new Error("Failed to decode JWT token");
            }

            logAuth("Decoded Google user info", {
              email: googleUser.email,
              name: googleUser.name,
              hasImage: !!googleUser.image
            });

            // Upsert user to Convex
            await convex.mutation(api.users.upsertUser, {
              email: googleUser.email,
              name: googleUser.name,
              image: googleUser.image,
              googleId: googleUser.id,
            });

            // Initialize queue settings
            await convex.mutation(api.queue.initializeQueueSettings, {
              updatedBy: googleUser.email,
            });

            setUser(googleUser);
            logAuth("User successfully authenticated and stored");
          } catch (error) {
            logAuthError("Error processing Google authentication", {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        },
      });

      // Check if user is already signed in (from cookie)
      const storedToken = getCookie('google_jwt');
      if (storedToken) {
        logAuth("Found JWT token in cookie, validating...");
        const decodedUser = decodeGoogleJWT(storedToken);
        if (decodedUser) {
          setToken(storedToken);
          setUser(decodedUser);
          logAuth("Restored user from JWT cookie", { email: decodedUser.email });
        } else {
          // Token is invalid or expired, remove it
          deleteCookie('google_jwt');
          logAuth("Removed invalid/expired JWT token from cookie");
        }
      }

      setIsLoading(false);
    };

    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      initGoogleAuth();
    } else {
      // Wait for the script to load
      const checkGoogleLoaded = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkGoogleLoaded);
          initGoogleAuth();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkGoogleLoaded);
        logAuthError("Google Identity Services failed to load within timeout");
        setIsLoading(false);
      }, 10000);
    }
  }, []);

  const signIn = () => {
    if (window.google?.accounts?.id) {
      logAuth("Triggering Google sign-in prompt");
      window.google.accounts.id.prompt();
    } else {
      logAuthError("Google Identity Services not available for sign-in");
    }
  };

  const signOut = () => {
    logAuth("Signing out user", { email: user?.email });
    setUser(null);
    setToken(null);
    deleteCookie('google_jwt');
    // Optionally revoke the token
    if (window.google?.accounts?.id) {
      // Note: GIS doesn't have a direct sign out method
      // You might need to handle this differently
    }
  };

  const value: GoogleAuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    loginButtonRef,
    token,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
}