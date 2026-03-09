"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { getToken } from "../../../lib/auth";
import ListingCard from "../../../components/ListingCard";

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' fill='%23f0f0f0'%3E%3Crect width='800' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%23999' font-family='Inter,sans-serif' font-size='20' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function ListingDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [moreFromSeller, setMoreFromSeller] = useState([]);
    const hasToken = typeof window !== "undefined" && !!getToken();

    useEffect(() => {
        apiFetch(`/listings/${id}`)
            .then((data) => {
                setListing(data);
                // Fetch more from this seller
                apiFetch("/listings")
                    .then((all) => {
                        const arr = Array.isArray(all) ? all : all?.listings || [];
                        setMoreFromSeller(arr.filter((l) => l.owner_id === data.owner_id && l.id !== data.id).slice(0, 3));
                    })
                    .catch(() => { });
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return <div className="container" style={{ paddingTop: "2rem" }}><p className="text-muted">Loading...</p></div>;
    }

    if (error || !listing) {
        return (
            <div className="container" style={{ paddingTop: "2rem", textAlign: "center" }}>
                <h2>Listing Not Found</h2>
                <p className="text-muted mt-2">{error || "This listing doesn't exist."}</p>
                <Link href="/marketplace" className="btn btn-primary mt-3">Back to Marketplace</Link>
            </div>
        );
    }

    const { title, description, price, category, condition, image_url, owner_id, location, created_at } = listing;

    return (
        <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
            <Link href="/marketplace" style={{ color: "var(--text-secondary)", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>
                ← Back to Marketplace
            </Link>

            {/* Image */}
            <div className="detail-image">
                <img src={image_url || PLACEHOLDER_IMG} alt={title} onError={(e) => { e.target.src = PLACEHOLDER_IMG; }} />
            </div>

            <div className="detail-info">
                {/* Main content */}
                <div>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        {category && <span className="badge badge-category">{category}</span>}
                        {condition && <span className="badge badge-condition">{condition}</span>}
                        <span className="badge badge-verified">✓ Verified</span>
                    </div>
                    <h1 style={{ marginBottom: "0.5rem" }}>{title}</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                        Posted {timeAgo(created_at)} {location && `• ${location}`}
                    </p>

                    {description && (
                        <div style={{ marginBottom: "2rem" }}>
                            <h3 style={{ marginBottom: "0.75rem" }}>Description</h3>
                            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{description}</p>
                        </div>
                    )}

                    {/* Specs grid */}
                    <div style={{ marginBottom: "2rem" }}>
                        <h3 style={{ marginBottom: "0.75rem" }}>Details</h3>
                        <div className="detail-specs">
                            {category && (
                                <div className="detail-spec">
                                    <div className="detail-spec-label">Category</div>
                                    <div className="detail-spec-value">{category}</div>
                                </div>
                            )}
                            {condition && (
                                <div className="detail-spec">
                                    <div className="detail-spec-label">Condition</div>
                                    <div className="detail-spec-value">{condition}</div>
                                </div>
                            )}
                            {location && (
                                <div className="detail-spec">
                                    <div className="detail-spec-label">Pickup Location</div>
                                    <div className="detail-spec-value">{location}</div>
                                </div>
                            )}
                            <div className="detail-spec">
                                <div className="detail-spec-label">Posted</div>
                                <div className="detail-spec-value">{timeAgo(created_at)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Safety tips */}
                    <div className="card" style={{ padding: "1.25rem", background: "var(--usc-gold-light)" }}>
                        <h4 style={{ marginBottom: "0.5rem" }}>🛡️ Safety Tips</h4>
                        <ul style={{ paddingLeft: "1.25rem", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.8 }}>
                            <li>Meet in a public place on campus</li>
                            <li>Never share personal financial information</li>
                            <li>Inspect items before completing the transaction</li>
                            <li>Use USC campus police safe exchange zones</li>
                        </ul>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="detail-sidebar">
                    <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                        <div className="price" style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                            {price ? `$${Number(price).toLocaleString()}` : "Contact for Price"}
                        </div>
                        {hasToken && owner_id ? (
                            <Link href={`/chats?with=${owner_id}`} className="btn btn-primary btn-full btn-lg" style={{ marginBottom: "0.75rem" }}>
                                💬 Contact Seller
                            </Link>
                        ) : (
                            <button className="btn btn-primary btn-full btn-lg" style={{ marginBottom: "0.75rem" }} disabled>
                                💬 Sign in to Contact
                            </button>
                        )}
                        <button className="btn btn-outline btn-full">Make an Offer</button>
                    </div>

                    {/* Seller info */}
                    <div className="card seller-card">
                        <h3 style={{ marginBottom: "1rem" }}>Seller Information</h3>
                        <div className="seller-header">
                            <div className="avatar">AT</div>
                            <div>
                                <div className="seller-name">
                                    Anonymous Trojan <span style={{ color: "var(--success-green)" }}>✓</span>
                                </div>
                                <div className="seller-rating">⭐ Verified Seller</div>
                            </div>
                        </div>
                        <div className="seller-stats">
                            <div className="seller-stat-row">
                                <span>Seller ID:</span>
                                <span>…{owner_id?.slice(-8)}</span>
                            </div>
                        </div>
                        {hasToken && owner_id && (
                            <Link href={`/chats?with=${owner_id}`} className="btn btn-outline btn-full btn-sm">View Seller Profile</Link>
                        )}
                    </div>
                </div>
            </div>

            {/* More from this seller */}
            {moreFromSeller.length > 0 && (
                <section style={{ marginTop: "3rem" }}>
                    <h2 style={{ marginBottom: "1rem" }}>More from this Seller</h2>
                    <div className="grid-3">
                        {moreFromSeller.map((l) => (
                            <ListingCard key={l.id} listing={l} showOwner={false} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
