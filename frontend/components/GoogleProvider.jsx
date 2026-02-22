"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function GoogleProvider({ children }) {
  if (!clientId) {
    return <>{children}</>;
  }
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const origin = window.location.origin;
    const originsToAdd = [origin];
    if (origin.startsWith("http://localhost:") || origin === "http://localhost") {
      if (origin !== "http://localhost") originsToAdd.push("http://localhost");
      if (origin !== "http://localhost:3000") originsToAdd.push("http://localhost:3000");
    }
    const unique = [...new Set(originsToAdd)];
    console.info(
      "[Google OAuth] Add these exact URLs to Authorized JavaScript origins (Web application client):",
      unique
    );
  }
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
