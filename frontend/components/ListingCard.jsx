"use client";

import Link from "next/link";

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

const PLACEHOLDER_IMAGES = [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f0f0f0'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%23999' font-family='Inter,sans-serif' font-size='16' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E",
];

export default function ListingCard({ listing, showOwner = true, showActions = false, onEdit, onDelete }) {
    const { id, title, price, category, condition, image_url, owner_id, created_at } = listing;

    let displayImg = image_url || PLACEHOLDER_IMAGES[0];
    if (image_url && image_url.startsWith("/uploads/")) {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
        displayImg = apiBase.replace("/api", "") + image_url;
    }

    return (
        <div className="card card-clickable">
            <Link href={`/marketplace/${id}`} style={{ display: "block" }}>
                <div className="listing-card-image">
                    <img
                        src={displayImg}
                        alt={title}
                        onError={(e) => { e.target.src = PLACEHOLDER_IMAGES[0]; }}
                    />
                    <div className="listing-card-badges">
                        <div>
                            {category && <span className="badge badge-category">{category}</span>}
                        </div>
                        <span className="badge badge-verified">✓ Verified</span>
                    </div>
                </div>
                <div className="listing-card-body">
                    <div className="listing-card-title">{title}</div>
                    <div className="listing-card-footer">
                        <span className="price price-sm">
                            {price ? `$${Number(price).toLocaleString()}` : "Price TBD"}
                        </span>
                        {condition && <span className="badge badge-condition">{condition}</span>}
                    </div>
                    <div className="listing-card-footer" style={{ marginTop: "0.5rem" }}>
                        {showOwner && owner_id && (
                            <span className="listing-card-date">
                                by …{owner_id.slice(-8)}
                            </span>
                        )}
                        <span className="listing-card-date">
                            {timeAgo(created_at)}
                        </span>
                    </div>
                </div>
            </Link>
            {showActions && (
                <div style={{ padding: "0 1.25rem 1.25rem", display: "flex", gap: "0.5rem" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <button className="btn btn-outline btn-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(listing); }} style={{ flex: 1 }}>Edit</button>
                    <button className="btn btn-outline btn-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(listing.id); }} style={{ flex: 1, color: "var(--cardinal-red)" }}>Delete</button>
                </div>
            )}
        </div>
    );
}
