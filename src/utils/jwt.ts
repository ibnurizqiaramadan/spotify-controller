// JWT utility functions for Google authentication

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

/**
 * Decode and validate a JWT token from Google Identity Services
 */
export const decodeGoogleJWT = (token: string): GoogleUser | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      console.warn("JWT token has expired");
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      image: payload.picture,
    };
  } catch (error) {
    console.error("Error decoding JWT token:", error);
    return null;
  }
};

/**
 * Check if a JWT token is valid and not expired
 */
export const isJWTValid = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return !payload.exp || payload.exp >= currentTime;
  } catch {
    return false;
  }
};

/**
 * Get expiration time from JWT token
 */
export const getJWTExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp || null;
  } catch {
    return null;
  }
};