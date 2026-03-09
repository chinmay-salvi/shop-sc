"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import ListingCard from "../../components/ListingCard";

const CATEGORIES = ["All", "Tickets", "Electronics", "Furniture", "Textbooks", "Clothing", "Sports", "Music", "Other"];
const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("recent");
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(8);

  useEffect(() => {
    apiFetch("/listings")
      .then((data) => setListings(Array.isArray(data) ? data : data?.listings || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  let filtered = listings;
  if (category !== "All") {
    filtered = filtered.filter((l) => l.category?.toLowerCase() === category.toLowerCase());
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l) =>
      l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
    );
  }

  if (sortBy === "price-low") {
    filtered = [...filtered].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (sortBy === "price-high") {
    filtered = [...filtered].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }

  const displayed = filtered.slice(0, displayCount);

  if (loading) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p className="text-muted">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Marketplace</h1>
        <p className="text-muted">Browse verified listings from fellow Trojans</p>
      </div>

      {error && <p style={{ color: "var(--cardinal-red)", marginBottom: "1rem" }}>{error}</p>}

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flex: 1 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${category === cat ? "btn-primary" : "btn-outline"}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <select className="select" style={{ width: "auto", minWidth: 160 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.5rem" }}>
        <input
          className="input"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Grid */}
      {displayed.length > 0 ? (
        <>
          <div className="grid-2">
            {displayed.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {displayCount < filtered.length && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <button className="btn btn-outline" onClick={() => setDisplayCount((c) => c + 8)}>
                Load More Listings
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>No listings found</p>
          <Link href="/marketplace/create" className="btn btn-cardinal" style={{ marginTop: "1rem" }}>
            Create the first listing →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center" }}><p className="text-muted">Loading marketplace...</p></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
