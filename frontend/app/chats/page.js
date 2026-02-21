"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { getStablePseudonym } from "../../lib/zkp";

export default function ChatsPage() {
  const [partners, setPartners] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [body, setBody] = useState("");
  const [myStableId, setMyStableId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasToken = typeof window !== "undefined" && !!getToken();

  useEffect(() => {
    getStablePseudonym().then(setMyStableId).catch(() => setMyStableId(""));
  }, []);

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    apiFetch("/chats/conversations")
      .then((data) => setPartners(data.partners || []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken || !selectedPartner) {
      setMessages([]);
      return;
    }
    apiFetch(`/chats/messages?with=${encodeURIComponent(selectedPartner)}`)
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]));
  }, [hasToken, selectedPartner]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!body.trim() || !selectedPartner) return;
    try {
      await apiFetch("/chats/messages", {
        method: "POST",
        body: JSON.stringify({ recipient_id: selectedPartner, body: body.trim() })
      });
      setBody("");
      apiFetch(`/chats/messages?with=${encodeURIComponent(selectedPartner)}`)
        .then((data) => setMessages(data.messages || []));
    } catch (e) {
      setError(e.message);
    }
  };

  if (!hasToken) {
    return (
      <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
        <p><Link href="/">← Home</Link></p>
        <p>Sign in (verify proof) to use chats.</p>
      </main>
    );
  }

  if (loading) return <p>Loading...</p>;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <p><Link href="/">← Home</Link></p>
      <h1>Chats</h1>
      <p style={{ fontSize: "0.9em", color: "#666" }}>Your ID (share to receive messages): …{myStableId.slice(-12)}</p>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <div style={{ width: 200 }}>
          <h3>Conversations</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {partners.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => setSelectedPartner(p)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.5rem",
                    background: selectedPartner === p ? "#eee" : "transparent"
                  }}
                >
                  …{p.slice(-8)}
                </button>
              </li>
            ))}
          </ul>
          {partners.length === 0 && <p>No conversations yet. Share your ID to get messages.</p>}
        </div>

        <div style={{ flex: 1 }}>
          {selectedPartner ? (
            <>
              <h3>With …{selectedPartner.slice(-8)}</h3>
              <ul style={{ listStyle: "none", padding: 0, maxHeight: 300, overflow: "auto" }}>
                {messages.map((m) => (
                  <li
                    key={m.id}
                    style={{
                      textAlign: m.sender_id === myStableId ? "right" : "left",
                      marginBottom: "0.5rem"
                    }}
                  >
                    <span style={{ display: "inline-block", padding: "0.25rem 0.5rem", background: "#f0f0f0", borderRadius: 8 }}>
                      {m.body}
                    </span>
                  </li>
                ))}
              </ul>
              <form onSubmit={sendMessage} style={{ marginTop: "0.5rem" }}>
                <input
                  placeholder="Message"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem" }}
                />
                <button type="submit" style={{ marginTop: "0.25rem" }}>Send</button>
              </form>
            </>
          ) : (
            <p>Select a conversation or share your ID so others can message you.</p>
          )}
        </div>
      </div>
    </main>
  );
}
