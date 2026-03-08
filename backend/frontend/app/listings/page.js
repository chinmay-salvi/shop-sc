"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { getToken } from "../../lib/auth";

function loadAll(setAll, setError) {
  apiFetch("/listings")
    .then((data) => setAll(Array.isArray(data) ? data : data.listings || []))
    .catch((e) => setError(e.message));
}

function loadMine(setMine) {
  apiFetch("/listings/mine")
    .then((data) => setMine(Array.isArray(data) ? data : data.listings || []))
    .catch(() => setMine([]));
}

export default function ListingsPage() {
  const [all, setAll] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const hasToken = typeof window !== "undefined" && !!getToken();

  useEffect(() => {
    Promise.all([
      apiFetch("/listings").then((data) => setAll(Array.isArray(data) ? data : data.listings || [])).catch((e) => setError(e.message)),
      hasToken ? apiFetch("/listings/mine").then((data) => setMine(Array.isArray(data) ? data : data.listings || [])).catch(() => setMine([])) : Promise.resolve()
    ]).finally(() => setLoading(false));
  }, [hasToken]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setSending(true);
    setError("");
    try {
      await apiFetch("/listings", {
        method: "POST",
        body: JSON.stringify({ title: createTitle.trim(), description: createDesc.trim() || undefined })
      });
      setCreateTitle("");
      setCreateDesc("");
      loadMine(setMine);
      loadAll(setAll, setError);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const startEdit = (listing) => {
    setEditingId(listing.id);
    setEditTitle(listing.title);
    setEditDesc(listing.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDesc("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    setSending(true);
    setError("");
    try {
      await apiFetch(`/listings/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle.trim(), description: editDesc.trim() || null })
      });
      cancelEdit();
      loadMine(setMine);
      loadAll(setAll, setError);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this listing?")) return;
    setError("");
    try {
      await apiFetch(`/listings/${id}`, { method: "DELETE" });
      loadMine(setMine);
      loadAll(setAll, setError);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <p>Loading listings...</p>;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <p><Link href="/">← Home</Link></p>
      <h1>Listings</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {hasToken && (
        <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>My listings</h2>
          <p style={{ color: "#666", fontSize: "0.9em" }}>Create and manage your own listings below.</p>
          <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
            <input
              placeholder="Title"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              style={{ display: "block", marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
            />
            <textarea
              placeholder="Description"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              style={{ display: "block", marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
              rows={2}
            />
            <button type="submit" disabled={sending}>Create listing</button>
          </form>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {mine.map((l) => (
              <li key={l.id} style={{ border: "1px solid #ccc", padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 4 }}>
                {editingId === l.id ? (
                  <form onSubmit={handleUpdate}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{ display: "block", marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      style={{ display: "block", marginBottom: "0.5rem", width: "100%", padding: "0.5rem" }}
                      rows={2}
                    />
                    <button type="submit" disabled={sending}>Save</button>
                    <button type="button" onClick={cancelEdit} style={{ marginLeft: "0.5rem" }}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <strong>{l.title}</strong> {l.description && `— ${l.description}`}
                    <div style={{ marginTop: "0.5rem" }}>
                      <button type="button" onClick={() => startEdit(l)} style={{ marginRight: "0.5rem" }}>Edit</button>
                      <button type="button" onClick={() => handleDelete(l.id)} style={{ color: "#c00" }}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ padding: "1rem 0" }}>
        <h2>All listings</h2>
        <p style={{ color: "#666", fontSize: "0.9em" }}>Browse all marketplace listings.</p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {all.map((l) => (
            <li key={l.id} style={{ border: "1px solid #ccc", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: 4 }}>
              <strong>{l.title}</strong> {l.description && `— ${l.description}`}
              <span style={{ color: "#666", fontSize: "0.9em" }}> (owner: …{l.owner_id?.slice(-8)})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
