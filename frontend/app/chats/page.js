"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { getStablePseudonym } from "../../lib/zkp";

function ChatsContent() {
  const searchParams = useSearchParams();
  const initialPartner = searchParams.get("with") || null;

  const [partners, setPartners] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(initialPartner);
  const [body, setBody] = useState("");
  const [myStableId, setMyStableId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newChatId, setNewChatId] = useState("");
  const hasToken = typeof window !== "undefined" && !!getToken();

  useEffect(() => {
    getStablePseudonym().then(setMyStableId).catch(() => setMyStableId(""));
  }, []);

  useEffect(() => {
    if (!hasToken) { setLoading(false); return; }
    apiFetch("/chats/conversations")
      .then((data) => {
        const p = data.partners || [];
        setPartners(p);
        // If initialPartner not in list, add it
        if (initialPartner && !p.includes(initialPartner)) {
          setPartners([initialPartner, ...p]);
        }
      })
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, [hasToken, initialPartner]);

  useEffect(() => {
    if (!hasToken || !selectedPartner) { setMessages([]); return; }
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
        body: JSON.stringify({ recipient_id: selectedPartner, body: body.trim() }),
      });
      setBody("");
      const data = await apiFetch(`/chats/messages?with=${encodeURIComponent(selectedPartner)}`);
      setMessages(data.messages || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const startNewChat = () => {
    if (!newChatId.trim() || !/^[a-f0-9]{64}$/i.test(newChatId.trim())) {
      setError("Enter a valid 64-character hex ID");
      return;
    }
    const id = newChatId.trim();
    if (!partners.includes(id)) setPartners((p) => [id, ...p]);
    setSelectedPartner(id);
    setNewChatId("");
    setError("");
  };

  if (!hasToken) {
    return (
      <div className="container" style={{ paddingTop: "3rem", textAlign: "center" }}>
        <h2>Sign in to use Chats</h2>
        <p className="text-muted mt-2">Verify your USC identity to message other Trojans.</p>
        <Link href="/" className="btn btn-cardinal mt-3">Go to Sign In</Link>
      </div>
    );
  }

  if (loading) return <div className="container" style={{ paddingTop: "2rem" }}><p className="text-muted">Loading...</p></div>;

  return (
    <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Messages</h1>
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
          Your ID (share to receive messages): <code style={{ background: "var(--light-bg)", padding: "0.2rem 0.5rem", borderRadius: 4, fontSize: "0.8rem" }}>…{myStableId.slice(-16)}</code>
        </p>
      </div>
      {error && <p style={{ color: "var(--cardinal-red)", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</p>}

      <div className="chat-layout">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-light)" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Conversations</h3>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                className="input"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                placeholder="Paste user ID to chat..."
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
              />
              <button className="btn btn-cardinal btn-sm" onClick={startNewChat} style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}>+</button>
            </div>
          </div>
          {partners.length === 0 ? (
            <p style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No conversations yet</p>
          ) : (
            partners.map((p) => (
              <div
                key={p}
                className={`chat-partner ${selectedPartner === p ? "chat-partner-active" : ""}`}
                onClick={() => setSelectedPartner(p)}
              >
                <div className="avatar avatar-sm">AT</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>…{p.slice(-8)}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Anonymous Trojan</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main chat */}
        <div className="chat-main">
          {selectedPartner ? (
            <>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="avatar avatar-sm">AT</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Anonymous Trojan</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>…{selectedPartner.slice(-8)}</div>
                </div>
              </div>
              <div className="chat-messages" style={{ minHeight: 300, maxHeight: "50vh" }}>
                {messages.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No messages yet. Say hello!</p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`chat-bubble ${m.sender_id === myStableId ? "chat-bubble-sent" : "chat-bubble-received"}`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <button type="submit" className="btn btn-cardinal">Send</button>
              </form>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minHeight: 400 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💬</div>
                <h3>Select a conversation</h3>
                <p className="text-muted mt-1">Or paste a user ID to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: "2rem" }}><p className="text-muted">Loading...</p></div>}>
      <ChatsContent />
    </Suspense>
  );
}
