"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { getToken } from "../../lib/auth";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const hasToken = typeof window !== "undefined" && !!getToken();

  useEffect(() => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setMyStableId(payload.sub || "");
      }
    } catch (_) {}
  }, []);

  const fetchPartners = useCallback(() => {
    if (!hasToken) return;
    apiFetch("/chats/conversations")
      .then((data) => {
        const p = data.partners || [];
        setPartners((prev) => {
          // Merge: keep any partner that's in prev but not returned yet (e.g. newly started)
          const ids = new Set(p.map((x) => x.partner_id || x));
          const extra = prev.filter((x) => {
            const id = x.partner_id || x;
            return !ids.has(id);
          });
          return [...p, ...extra];
        });
        if (initialPartner) {
          setPartners((prev) => {
            const ids = new Set(prev.map((x) => x.partner_id || x));
            if (!ids.has(initialPartner)) return [{ partner_id: initialPartner }, ...prev];
            return prev;
          });
        }
      })
      .catch(() => {});
  }, [hasToken, initialPartner]);

  useEffect(() => {
    if (!hasToken) { setLoading(false); return; }
    fetchPartners();
    setLoading(false);
  }, [hasToken, fetchPartners]);

  const fetchMessages = useCallback(() => {
    if (!hasToken || !selectedPartner) return;
    apiFetch(`/chats/messages?with=${encodeURIComponent(selectedPartner)}`)
      .then((data) => {
        setMessages((prev) => {
          const next = data.messages || [];
          // Only update if something changed (avoid re-render flicker)
          if (JSON.stringify(prev.map((m) => m.id)) === JSON.stringify(next.map((m) => m.id))) return prev;
          return next;
        });
      })
      .catch(() => {});
  }, [hasToken, selectedPartner]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 3 seconds when a conversation is open
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!hasToken || !selectedPartner) { setMessages([]); return; }
    fetchMessages();
    pollRef.current = setInterval(() => {
      fetchMessages();
      fetchPartners();
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [hasToken, selectedPartner, fetchMessages, fetchPartners]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!body.trim() || !selectedPartner || sending) return;
    setSending(true);
    try {
      await apiFetch("/chats/messages", {
        method: "POST",
        body: JSON.stringify({ recipient_id: selectedPartner, body: body.trim() }),
      });
      setBody("");
      fetchMessages();
      fetchPartners();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const startNewChat = () => {
    if (!newChatId.trim() || !/^[a-f0-9]{64}$/i.test(newChatId.trim())) {
      setError("Enter a valid 64-character hex ID");
      return;
    }
    const id = newChatId.trim();
    setPartners((prev) => {
      const ids = new Set(prev.map((x) => x.partner_id || x));
      if (ids.has(id)) return prev;
      return [{ partner_id: id }, ...prev];
    });
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
          Your ID (share to receive messages):{" "}
          <code style={{ background: "var(--light-bg)", padding: "0.2rem 0.5rem", borderRadius: 4, fontSize: "0.8rem" }}>
            …{myStableId.slice(-16)}
          </code>
        </p>
      </div>
      {error && (
        <p style={{ color: "var(--cardinal-red)", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</p>
      )}

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
                onKeyDown={(e) => e.key === "Enter" && startNewChat()}
              />
              <button
                className="btn btn-cardinal btn-sm"
                onClick={startNewChat}
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
              >
                +
              </button>
            </div>
          </div>

          {partners.length === 0 ? (
            <p style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No conversations yet</p>
          ) : (
            partners.map((p) => {
              const partnerId = p.partner_id || p;
              const lastMsg = p.last_message;
              const lastAt = p.last_message_at;
              const isActive = selectedPartner === partnerId;
              return (
                <div
                  key={partnerId}
                  className={`chat-partner ${isActive ? "chat-partner-active" : ""}`}
                  onClick={() => setSelectedPartner(partnerId)}
                >
                  <div className="avatar avatar-sm">AT</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>…{partnerId.slice(-8)}</div>
                      {lastAt && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", flexShrink: 0, marginLeft: "0.5rem" }}>
                          {timeAgo(lastAt)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lastMsg || "Anonymous Trojan"}
                    </div>
                  </div>
                </div>
              );
            })
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
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
                    No messages yet. Say hello!
                  </p>
                )}
                {messages.map((m) => {
                  const isSent = m.sender_id === myStableId;
                  return (
                    <div
                      key={m.id}
                      style={{ display: "flex", flexDirection: "column", alignItems: isSent ? "flex-end" : "flex-start" }}
                    >
                      <div className={`chat-bubble ${isSent ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem", marginBottom: "0.25rem" }}>
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                  className="input"
                  placeholder="Type a message… (Enter to send)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button type="submit" className="btn btn-cardinal" disabled={sending || !body.trim()}>
                  {sending ? "…" : "Send"}
                </button>
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
