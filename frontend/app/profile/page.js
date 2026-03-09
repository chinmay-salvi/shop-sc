"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { getToken, clearToken } from "../../lib/auth";
import { isEnrolled, backupIdentityWithPassword, getStablePseudonym } from "../../lib/zkp";
import ListingCard from "../../components/ListingCard";

export default function ProfilePage() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myStableId, setMyStableId] = useState("");
    const [backupPassword, setBackupPassword] = useState("");
    const [backupStatus, setBackupStatus] = useState("");
    const [editEntry, setEditEntry] = useState(null);
    const [editForm, setEditForm] = useState({ title: "", description: "", price: "", category: "", condition: "", location: "", image_url: "" });
    const hasToken = typeof window !== "undefined" && !!getToken();

    const loadListings = useCallback(() => {
        if (!hasToken) { setLoading(false); return; }
        apiFetch("/listings/mine")
            .then((data) => setListings(Array.isArray(data) ? data : []))
            .catch(() => setListings([]))
            .finally(() => setLoading(false));
    }, [hasToken]);

    useEffect(() => {
        loadListings();
        getStablePseudonym().then(setMyStableId).catch(() => { });
    }, [loadListings]);

    const handleDelete = async (id) => {
        if (!confirm("Delete this listing?")) return;
        try {
            await apiFetch(`/listings/${id}`, { method: "DELETE" });
            setListings((prev) => prev.filter((l) => l.id !== id));
        } catch (e) {
            alert("Delete failed: " + e.message);
        }
    };

    const handleEdit = (listing) => {
        setEditEntry(listing);
        setEditForm({
            title: listing.title || "",
            description: listing.description || "",
            price: listing.price || "",
            category: listing.category || "",
            condition: listing.condition || "",
            location: listing.location || "",
            image_url: listing.image_url || "",
        });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const body = {
                title: editForm.title,
                description: editForm.description || undefined,
                price: editForm.price ? Number(editForm.price) : undefined,
                category: editForm.category || undefined,
                condition: editForm.condition || undefined,
                location: editForm.location || undefined,
                image_url: editForm.image_url || undefined,
            };
            await apiFetch(`/listings/${editEntry.id}`, {
                method: "PATCH",
                body: JSON.stringify(body),
            });
            setEditEntry(null);
            loadListings();
        } catch (e) {
            alert("Update failed: " + e.message);
        }
    };

    const handleBackup = async () => {
        if (!backupPassword.trim()) { setBackupStatus("Enter a password"); return; }
        try {
            setBackupStatus("Backing up...");
            await backupIdentityWithPassword(backupPassword.trim());
            setBackupStatus("✓ Identity backed up successfully");
            setBackupPassword("");
        } catch (e) {
            setBackupStatus("Failed: " + e.message);
        }
    };

    const handleLogout = () => {
        clearToken();
        window.location.href = "/";
    };

    if (!hasToken) {
        return (
            <div className="container" style={{ paddingTop: "3rem", textAlign: "center" }}>
                <h2>Sign in to view your profile</h2>
                <p className="text-muted mt-2">Verify your USC identity first.</p>
                <Link href="/" className="btn btn-cardinal mt-3">Go to Sign In</Link>
            </div>
        );
    }

    const activeCount = listings.length;

    return (
        <>
            {/* Profile Header */}
            <div className="profile-header">
                <div className="container profile-header-content">
                    <div className="avatar avatar-lg">AT</div>
                    <div>
                        <div className="profile-name">Anonymous Trojan</div>
                        <div className="profile-meta">
                            <div className="profile-meta-item">⭐ Verified</div>
                            <div className="profile-meta-item">📦 {activeCount} Listings</div>
                            {myStableId && (
                                <div className="profile-meta-item">
                                    🔑 …{myStableId.slice(-12)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-sm" style={{ background: "rgba(0,0,0,0.1)", color: "var(--dark)" }} onClick={handleLogout}>
                            ⚙️ Log out
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="container profile-stats">
                <div className="grid-3">
                    <div className="card stat-card">
                        <div className="stat-card-icon" style={{ background: "#FEF3C7" }}>📦</div>
                        <div className="stat-card-value">{activeCount}</div>
                        <div className="stat-card-label">Total Listings</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-card-icon" style={{ background: "#DCFCE7" }}>✅</div>
                        <div className="stat-card-value">{activeCount}</div>
                        <div className="stat-card-label">Active Listings</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-card-icon" style={{ background: "#EDE9FE" }}>🎯</div>
                        <div className="stat-card-value">—</div>
                        <div className="stat-card-label">Completed Sales</div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
                {/* Identity Backup */}
                {isEnrolled() && (
                    <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                        <h4 style={{ marginBottom: "0.75rem" }}>🔑 Identity Backup</h4>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                            Back up your identity to recover it on another device.
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input type="password" className="input" style={{ maxWidth: 300 }} placeholder="Choose a backup password" value={backupPassword} onChange={(e) => setBackupPassword(e.target.value)} />
                            <button className="btn btn-outline btn-sm" onClick={handleBackup}>Backup</button>
                        </div>
                        {backupStatus && <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{backupStatus}</p>}
                    </div>
                )}

                {/* My Listings */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h2>My Listings</h2>
                    <Link href="/marketplace/create" className="btn btn-cardinal btn-sm">Create New Listing</Link>
                </div>

                {loading ? (
                    <p className="text-muted">Loading...</p>
                ) : listings.length === 0 ? (
                    <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
                        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>You haven't listed any items yet</p>
                        <Link href="/marketplace/create" className="btn btn-cardinal mt-3">Create your first listing</Link>
                    </div>
                ) : (
                    <div className="grid-2">
                        {listings.map((l) => (
                            <ListingCard key={l.id} listing={l} showOwner={false} showActions onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editEntry && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 2000, padding: "1rem"
                }} onClick={(e) => { if (e.target === e.currentTarget) setEditEntry(null); }}>
                    <div className="card" style={{ maxWidth: 500, width: "100%", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ marginBottom: "1rem" }}>Edit Listing</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label className="label">Title</label>
                                <input className="input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="label">Description</label>
                                <textarea className="textarea" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className="form-group">
                                    <label className="label">Price</label>
                                    <input className="input" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Category</label>
                                    <input className="input" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Condition</label>
                                    <input className="input" value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Location</label>
                                    <input className="input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Image URL</label>
                                <input className="input" value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                                <button type="submit" className="btn btn-cardinal" style={{ flex: 1 }}>Save Changes</button>
                                <button type="button" className="btn btn-outline" onClick={() => setEditEntry(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
