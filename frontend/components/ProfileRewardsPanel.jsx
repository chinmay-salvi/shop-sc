"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { getToken } from "../lib/auth";

function formatRewardsError(msg) {
    if (msg === "INVALID_TOKEN" || msg === "MISSING_BEARER_TOKEN") {
        return "Your session is missing or no longer valid. Log out, sign in again, then refresh this page.";
    }
    return msg;
}

function asNum(v) {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export default function ProfileRewardsPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!getToken()) {
            setLoading(false);
            return;
        }
        const ac = new AbortController();
        setLoading(true);
        setError(null);
        apiFetch("/rewards/me", { signal: ac.signal })
            .then(setData)
            .catch((e) => {
                if (e.name === "AbortError") return;
                setError(formatRewardsError(e.message || "Failed to load"));
                setData(null);
            })
            .finally(() => {
                if (!ac.signal.aborted) setLoading(false);
            });
        return () => ac.abort();
    }, []);

    const buys = data != null ? asNum(data.buys) : null;
    const sales = data != null ? asNum(data.sales) : null;
    const tokens = data != null ? asNum(data.tokens) : null;
    const tier =
        typeof data?.tier === "string" && data.tier.trim() !== ""
            ? data.tier
            : null;
    const total = buys != null && sales != null ? buys + sales : null;

    return (
        <div className="container profile-stats" style={{ marginTop: "1rem" }}>
            <div className="card" style={{ padding: "1.5rem 1.75rem" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.15rem" }}>Rewards</h3>
                {error && (
                    <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        {error}{" "}
                        <Link href="/" style={{ textDecoration: "underline" }}>Home</Link>
                    </p>
                )}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: "1rem",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Tier
                        </div>
                        <div
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 800,
                                color: "var(--dark)",
                                marginTop: "0.2rem",
                            }}
                        >
                            {loading ? "…" : tier ?? "—"}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Tokens
                        </div>
                        <div
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 800,
                                color: "var(--dark)",
                                marginTop: "0.2rem",
                            }}
                        >
                            {loading ? "…" : tokens ?? "—"}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Buys
                        </div>
                        <div
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: 700,
                                color: "var(--dark)",
                                marginTop: "0.2rem",
                            }}
                        >
                            {loading ? "…" : buys ?? "—"}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Sales
                        </div>
                        <div
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: 700,
                                color: "var(--dark)",
                                marginTop: "0.2rem",
                            }}
                        >
                            {loading ? "…" : sales ?? "—"}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Total trades
                        </div>
                        <div
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: 700,
                                color: "var(--dark)",
                                marginTop: "0.2rem",
                            }}
                        >
                            {loading ? "…" : total ?? "—"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
