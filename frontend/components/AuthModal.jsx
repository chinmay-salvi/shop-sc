"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
    enrollWithGoogle,
    enrollWithEmail,
    verifyProofAndCreateSession,
    recoverIdentityWithPassword,
    isEnrolled,
    USE_JWT_ZK_LOGIN,
    loginWithJwtZk
} from "../lib/zkp";

const GoogleLogin = dynamic(
    () => import("@react-oauth/google").then((m) => m.GoogleLogin),
    { ssr: false }
);

const hasGoogleClientId = typeof process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "string" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0;

export default function AuthModal() {
    const [show, setShow] = useState(false);
    const [status, setStatus] = useState("");
    const [devEmail, setDevEmail] = useState("");
    const [recoveryPassword, setRecoveryPassword] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleOpen = () => setShow(true);
        window.addEventListener("openAuthModal", handleOpen);
        return () => window.removeEventListener("openAuthModal", handleOpen);
    }, []);

    const handleGoogleCredential = async (credentialResponse) => {
        const idToken = credentialResponse?.credential;
        if (!idToken) {
            setStatus("No credential from Google.");
            return;
        }
        try {
            if (USE_JWT_ZK_LOGIN) {
                setStatus("Generating ZK proof (this may take a moment)...");
                await loginWithJwtZk(idToken);
                setStatus("Signed in! Redirecting...");
                setShow(false);
                window.location.reload();
                return;
            }
            setStatus("Enrolling with Google...");
            await enrollWithGoogle(idToken);
            setStatus("Enrolled. Now click Verify Proof to get a session.");
        } catch (e) {
            setStatus(`Sign-in failed: ${e.message}`);
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
            setStatus("Session created!");
            window.location.reload();
        } catch (e) {
            setStatus(`Verify failed: ${e.message}`);
        }
    };

    const handleRecover = async () => {
        if (!recoveryPassword.trim()) { setStatus("Enter your recovery password."); return; }
        try {
            setStatus("Recovering identity...");
            await recoverIdentityWithPassword(recoveryPassword.trim());
            setStatus("Identity recovered. Click Verify proof to log in.");
            setRecoveryPassword("");
        } catch (e) {
            setStatus(`Recovery failed: ${e.message}`);
        }
    };

    const enrolled = mounted && isEnrolled();

    if (!show) return null;

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2000, padding: "1rem"
        }} onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
            <div className="card" style={{ maxWidth: 460, width: "100%", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }}>
                <h2 style={{ marginBottom: "0.5rem" }}>Sign In to ShopSC</h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                    {USE_JWT_ZK_LOGIN
                        ? "Sign in with Google (@usc.edu). Your token stays in this browser; only a ZK proof is sent."
                        : "Enroll with your USC Google account or dev email."}
                </p>

                {hasGoogleClientId && (
                    <div style={{ marginBottom: "1rem" }}>
                        <GoogleLogin
                            onSuccess={handleGoogleCredential}
                            onError={() => setStatus("Google sign-in failed.")}
                            useOneTap={false}
                            hosted_domain="usc.edu"
                        />
                    </div>
                )}

                {!USE_JWT_ZK_LOGIN && (
                    <>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                            <input
                                className="input"
                                placeholder="you@usc.edu (dev)"
                                value={devEmail}
                                onChange={(e) => setDevEmail(e.target.value)}
                            />
                            <button className="btn btn-outline" onClick={handleDevEnroll}>Enroll</button>
                        </div>
                        {enrolled && (
                            <button className="btn btn-primary btn-full" onClick={handleVerify} style={{ marginBottom: "1rem" }}>
                                Verify Proof (Login)
                            </button>
                        )}
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Recover identity:</p>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <input type="password" className="input" placeholder="Recovery password" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} />
                                <button className="btn btn-outline" onClick={handleRecover}>Recover</button>
                            </div>
                        </div>
                    </>
                )}

                {status && <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>{status}</p>}
            </div>
        </div>
    );
}
