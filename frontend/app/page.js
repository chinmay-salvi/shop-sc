"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getToken } from "../lib/auth";
import { apiFetch } from "../lib/api";
import ListingCard from "../components/ListingCard";

const CATEGORIES = [
  { name: "Tickets", icon: "🎟️" },
  { name: "Electronics", icon: "💻" },
  { name: "Furniture", icon: "🪑" },
  { name: "Textbooks", icon: "📚" },
  { name: "Clothing", icon: "👕" },
  { name: "Sports", icon: "⚽" },
  { name: "Music", icon: "🎵" },
  { name: "Other", icon: "📦" },
];

const VALUE_PROPS = [
  {
    icon: "🛡️",
    title: "Verified Trojans Only",
    description: "Every user is verified through USC Google accounts. Only @usc.edu students can access the marketplace.",
    color: "#DCFCE7",
  },
  {
    icon: "🔒",
    title: "Privacy First",
    description: "Zero-Knowledge proof verification ensures your identity stays anonymous. No personal information stored.",
    color: "#FEF3C7",
  },
  {
    icon: "✨",
    title: "Safe & Secure",
    description: "Built with end-to-end security. Your data is encrypted and your identity is protected by cryptographic proofs.",
    color: "#EDE9FE",
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [recentListings, setRecentListings] = useState([]);
  const [listingCount, setListingCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    apiFetch("/listings")
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.listings || [];
        setRecentListings(arr.slice(0, 4));
        setListingCount(arr.length);
      })
      .catch(() => { });
  }, []);

  const hasSession = mounted && !!getToken();

  return (
    <>
      {/* ===== Hero Section ===== */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-badge">USC Exclusive Marketplace</div>
          <h1>The Trojan Marketplace Built on Trust</h1>
          <p>
            Buy and sell safely within the USC community. Anonymous verification,
            zero compromises on privacy.
          </p>
          <div className="hero-buttons">
            <Link href="/marketplace" className="btn btn-lg" style={{ background: "var(--white)", color: "var(--dark)" }}>
              Browse Marketplace →
            </Link>
            {hasSession ? (
              <Link href="/marketplace/create" className="btn btn-lg btn-outline" style={{ borderColor: "rgba(255,255,255,0.5)", color: "var(--white)" }}>
                List an Item
              </Link>
            ) : (
              <button
                className="btn btn-lg btn-outline"
                style={{ borderColor: "rgba(255,255,255,0.5)", color: "var(--white)" }}
                onClick={() => window.dispatchEvent(new Event('openAuthModal'))}
              >
                List an Item
              </button>
            )}
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-icon">✓</span>
              {listingCount > 0 ? `${listingCount}+ Active Listings` : "Active Listings"}
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon">✓</span>
              100% Verified Trojans
            </div>
          </div>
        </div>
      </section>

      {/* ===== Value Propositions ===== */}
      <section className="section">
        <div className="container">
          <div className="grid-3">
            {VALUE_PROPS.map((vp) => (
              <div key={vp.title} className="card value-card">
                <div className="value-card-icon" style={{ background: vp.color }}>{vp.icon}</div>
                <h3>{vp.title}</h3>
                <p>{vp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Categories ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <h2>Browse Categories</h2>
            <Link href="/marketplace" className="btn btn-ghost">View all →</Link>
          </div>
          <div className="grid-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.name} href={`/marketplace?category=${encodeURIComponent(cat.name)}`}>
                <div className="card category-card">
                  <div className="category-card-icon">{cat.icon}</div>
                  <h4>{cat.name}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Recent Listings ===== */}
      {recentListings.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header">
              <h2>Recent Listings</h2>
              <Link href="/marketplace" className="btn btn-ghost">View all →</Link>
            </div>
            <div className="grid-2">
              {recentListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Footer ===== */}
      <footer className="footer" style={{ marginTop: "2rem" }}>
        <div className="container">
          <p>© 2026 ShopSC — Trojan Marketplace. No PII stored. Privacy-preserving by design.</p>
        </div>
      </footer>
    </>
  );
}
