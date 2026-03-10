"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { getToken } from "../../../lib/auth";

const CATEGORIES = ["Tickets", "Electronics", "Furniture", "Textbooks", "Clothing", "Sports", "Music", "Other"];
const CONDITIONS = ["New", "Like New", "Good", "Excellent", "Fair"];

export default function CreateListingPage() {
    const router = useRouter();
    const [hasToken, setHasToken] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        condition: "",
        price: "",
        location: "",
        image_url: "",
        image: null,
    });
    const fileInputRef = useRef(null);

    useEffect(() => {
        setHasToken(!!getToken());
    }, []);

    const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setError("Title is required"); return; }
        setSending(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("title", form.title.trim());
            if (form.description.trim()) formData.append("description", form.description.trim());
            if (form.category) formData.append("category", form.category);
            if (form.condition) formData.append("condition", form.condition);
            if (form.price) formData.append("price", form.price);
            if (form.location.trim()) formData.append("location", form.location.trim());
            if (form.image_url.trim()) formData.append("image_url", form.image_url.trim());
            if (form.image) formData.append("image", form.image);

            await apiFetch("/listings", {
                method: "POST",
                body: formData,
            });
            router.push("/marketplace");
        } catch (e) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    };

    if (!hasToken) {
        return (
            <div className="container" style={{ paddingTop: "3rem", textAlign: "center" }}>
                <h2>Sign in to create a listing</h2>
                <p className="text-muted mt-2">You need to verify your USC identity first.</p>
                <Link href="/" className="btn btn-cardinal mt-3">Go to Sign In</Link>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: 720, paddingTop: "1.5rem", paddingBottom: "3rem" }}>
            <div className="create-listing-header">
                <Link href="/marketplace" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>← Back to Marketplace</Link>
                <h1 style={{ marginTop: "0.75rem" }}>Create Listing</h1>
                <p className="text-muted">List your item for fellow Trojans to purchase</p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Photos Section */}
                <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>📷 Photos</h3>

                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                update("image", e.target.files[0]);
                                update("image_url", ""); // clear url if file selected
                            }
                        }}
                    />

                    <div
                        className="upload-area"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: "pointer", border: form.image ? "2px solid var(--cardinal-red)" : "2px dashed var(--border)", background: form.image ? "var(--bg-light)" : "transparent" }}
                    >
                        {form.image ? (
                            <div style={{ padding: "2rem 0", color: "var(--cardinal-red)", fontWeight: 600 }}>
                                ✅ {form.image.name} selected
                            </div>
                        ) : (
                            <>
                                <div className="upload-icon">⬆️</div>
                                <div className="upload-text">Click to upload photo</div>
                                <div className="upload-hint">PNG, JPG up to 10MB</div>
                            </>
                        )}
                    </div>
                    <div className="form-group" style={{ marginTop: "1rem" }}>
                        <label className="label">Or paste image URL</label>
                        <input
                            className="input"
                            placeholder="https://example.com/image.jpg"
                            value={form.image_url}
                            onChange={(e) => update("image_url", e.target.value)}
                        />
                    </div>
                </div>

                {/* Basic Information */}
                <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Basic Information</h3>

                    <div className="form-group">
                        <label className="label">Title *</label>
                        <input
                            className="input"
                            placeholder="e.g., Calculus Textbook - Like New"
                            value={form.title}
                            onChange={(e) => update("title", e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            className="textarea"
                            placeholder="Include a detailed description of your item. Include condition, any defects, reason for selling, etc."
                            rows={4}
                            value={form.description}
                            onChange={(e) => update("description", e.target.value)}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div className="form-group">
                            <label className="label">Category</label>
                            <select className="select" value={form.category} onChange={(e) => update("category", e.target.value)}>
                                <option value="">Select category</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Condition</label>
                            <select className="select" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
                                <option value="">Select condition</option>
                                {CONDITIONS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Pricing & Location */}
                <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Pricing & Location</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div className="form-group">
                            <label className="label">Price ($)</label>
                            <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={form.price}
                                onChange={(e) => update("price", e.target.value)}
                            />
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                                💡 Tip: Check similar listings for pricing reference
                            </p>
                        </div>
                        <div className="form-group">
                            <label className="label">Pickup Location</label>
                            <input
                                className="input"
                                placeholder="e.g., Leavey Library, Tommy Trojan"
                                value={form.location}
                                onChange={(e) => update("location", e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {error && <p style={{ color: "var(--cardinal-red)", marginBottom: "1rem" }}>{error}</p>}

                <div style={{ display: "flex", gap: "1rem" }}>
                    <button type="submit" className="btn btn-cardinal btn-lg" disabled={sending} style={{ flex: 1 }}>
                        {sending ? "Publishing..." : "Publish Listing"}
                    </button>
                    <Link href="/marketplace" className="btn btn-outline btn-lg">Cancel</Link>
                </div>
            </form>
        </div>
    );
}
