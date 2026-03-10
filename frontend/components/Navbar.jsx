"use client";

import Link from "next/link";
import AuthModal from "./AuthModal";
import { usePathname } from "next/navigation";
import { getToken } from "../lib/auth";
import { useState, useEffect } from "react";

export default function Navbar() {
    const pathname = usePathname();
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        setHasSession(!!getToken());
    }, []);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link href="/" className="navbar-logo">
                    <div className="navbar-logo-icon">S</div>
                    <div className="navbar-logo-text">
                        <h1>ShopSC</h1>
                        <span>Trojan Marketplace</span>
                    </div>
                </Link>

                <div className="navbar-search">
                    <span className="navbar-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search for textbooks, furniture, tickets..."
                    />
                </div>

                <div className="navbar-actions">
                    <Link
                        href="/marketplace"
                        className={`btn btn-ghost ${pathname === "/marketplace" ? "btn-ghost-active" : ""}`}
                    >
                        Browse
                    </Link>
                    <Link href="/marketplace/create" className="btn btn-cardinal btn-sm">
                        ＋ Sell
                    </Link>
                    {hasSession ? (
                        <Link href="/profile" className="navbar-profile-btn">
                            👤
                        </Link>
                    ) : (
                        <button onClick={() => window.dispatchEvent(new Event("openAuthModal"))} className="navbar-profile-btn" style={{ border: "1px solid var(--border)", background: "var(--white)", cursor: "pointer" }}>
                            👤
                        </button>
                    )}
                </div>
            </div>
            <AuthModal />
        </nav>
    );
}
