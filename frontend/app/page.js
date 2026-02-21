"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  enrollWithGoogle,
  enrollWithEmail,
  verifyProofAndCreateSession,
  backupIdentityWithPassword,
  recoverIdentityWithPassword,
  isEnrolled
} from "../lib/zkp";
import { getToken } from "../lib/auth";

const GoogleLogin = dynamic(
  () => import("@react-oauth/google").then((m) => m.GoogleLogin),
  { ssr: false }
);

const hasGoogleClientId = typeof process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "string" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0;

export default function HomePage() {
  const [status, setStatus] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [backupPassword, setBackupPassword] = useState("");

  const handleGoogleCredential = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setStatus("No credential from Google.");
      return;
    }
    try {
      setStatus("Enrolling with Google...");
      await enrollWithGoogle(idToken);
      setStatus("Enrolled. Now click Verify Proof to get a session.");
    } catch (e) {
      setStatus(`Enroll failed: ${e.message}`);
    }
  };

  const handleDevEnroll = async () => {
    try {
      setStatus("Enrolling (dev)...");
      await enrollWithEmail(devEmail);
      setStatus("Enrolled. Now click Verify Proof to get a session.");
    } catch (e) {
      setStatus(`Enroll failed: ${e.message}`);
    }
  };

  const handleVerify = async () => {
    try {
      setStatus("Generating proof (3–8s)...");
      await verifyProofAndCreateSession();
      setStatus("Session created. Go to Listings or Chats.");
    } catch (e) {
      setStatus(`Verify failed: ${e.message}`);
    }
  };

  const handleBackup = async () => {
    if (!backupPassword.trim()) {
      setStatus("Enter a recovery password to back up.");
      return;
    }
    try {
      setStatus("Backing up identity...");
      await backupIdentityWithPassword(backupPassword.trim());
      setStatus("Identity backed up. Use this password to recover on another session or device.");
      setBackupPassword("");
    } catch (e) {
      setStatus(`Backup failed: ${e.message}`);
    }
  };

  const handleRecover = async () => {
    if (!recoveryPassword.trim()) {
      setStatus("Enter your recovery password.");
      return;
    }
    try {
      setStatus("Recovering identity...");
      await recoverIdentityWithPassword(recoveryPassword.trim());
      setStatus("Identity recovered. Click Verify proof to log in.");
      setRecoveryPassword("");
    } catch (e) {
      setStatus(`Recovery failed: ${e.message}`);
    }
  };

  const enrolled = isEnrolled();
  const hasSession = typeof window !== "undefined" && !!getToken();

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>shop-sc</h1>
      <p>USC-only, privacy-preserving marketplace. No PII stored.</p>

      {!enrolled && (
        <>
          <p>Enroll with Google (@usc.edu) or use dev email:</p>
          {hasGoogleClientId && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
              <GoogleLogin
                onSuccess={handleGoogleCredential}
                onError={() => setStatus("Google sign-in failed.")}
                useOneTap={false}
                hosted_domain="usc.edu"
              />
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
            <input
              style={{ padding: "0.5rem", width: 240 }}
              placeholder="you@usc.edu (dev)"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
            />
            <button type="button" onClick={handleDevEnroll}>
              Enroll (dev)
            </button>
          </div>
          <div style={{ borderTop: "1px solid #eee", paddingTop: "1rem", marginTop: "1rem" }}>
            <p style={{ fontSize: "0.9em", color: "#666", marginBottom: "0.5rem" }}>
              Already enrolled? Recover your identity to access your listings in this session:
            </p>
            <input
              type="password"
              style={{ padding: "0.5rem", width: 240, marginRight: "0.5rem" }}
              placeholder="Recovery password"
              value={recoveryPassword}
              onChange={(e) => setRecoveryPassword(e.target.value)}
            />
            <button type="button" onClick={handleRecover}>
              Recover identity
            </button>
          </div>
        </>
      )}

      {enrolled && (
        <>
          <p style={{ fontSize: "0.9em", color: "#666" }}>
            Use <strong>Verify proof</strong> to log in. Back up your identity so you can recover it in any session or device and keep editing your listings.
          </p>
          <button type="button" onClick={handleVerify} style={{ marginRight: "0.5rem" }}>
            Verify proof (login)
          </button>
          {hasSession && (
            <span style={{ marginLeft: "0.5rem" }}>
              <Link href="/listings">Listings</Link> | <Link href="/chats">Chats</Link>
            </span>
          )}
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f9f9f9", borderRadius: 6 }}>
            <p style={{ fontSize: "0.9em", marginBottom: "0.5rem" }}>
              <strong>Back up identity</strong> (use a password you’ll remember; needed to recover on another session/device):
            </p>
            <input
              type="password"
              style={{ padding: "0.5rem", width: 220, marginRight: "0.5rem" }}
              placeholder="Recovery password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
            />
            <button type="button" onClick={handleBackup}>
              Back up
            </button>
          </div>
        </>
      )}

      <p style={{ marginTop: "1rem" }}>{status}</p>
    </main>
  );
}
