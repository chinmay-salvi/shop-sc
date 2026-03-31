
"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "../lib/api";
import ReactMarkdown from "react-markdown";

const WELCOME = "Hey! 👋 I'm Tommy Trojan, your shop-sc assistant. I can help you find listings, write descriptions, or answer questions about the marketplace. What can I help you with?";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  function clearChat() {
    setMessages([{ role: "assistant", content: WELCOME }]);
    setError(null);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const apiMessages = updated.filter((m) => m.content !== WELCOME);
      const data = await apiFetch("/ai-chat", {
        method: "POST",
        body: JSON.stringify({ messages: apiMessages }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {isOpen && (
        <div style={{
          position: "fixed", bottom: "90px", right: "24px", width: "360px",
          height: "500px", background: "#fff", borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex",
          flexDirection: "column", zIndex: 1000, overflow: "hidden",
          fontFamily: "sans-serif", border: "1px solid #e5e7eb"
        }}>

          {/* Header */}
          <div style={{
            background: "#990000", color: "#fff", padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "16px"
              }}>🤖</div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>Tommy Trojan</div>
                <div style={{ fontSize: "11px", opacity: 0.85 }}>USC Marketplace Helper</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={clearChat} style={{
                background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                fontSize: "11px", cursor: "pointer", borderRadius: "8px",
                padding: "4px 8px", fontFamily: "sans-serif"
              }}>Clear</button>
              <button onClick={() => setIsOpen(false)} style={{
                background: "none", border: "none", color: "#fff",
                fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "2px 6px"
              }}>×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: "10px"
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start"
              }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: "14px",
                  fontSize: "14px", lineHeight: "1.5",
                  background: m.role === "user" ? "#990000" : "#f3f4f6",
                  color: m.role === "user" ? "#fff" : "#111",
                  borderBottomRightRadius: m.role === "user" ? "4px" : "14px",
                  borderBottomLeftRadius: m.role === "assistant" ? "4px" : "14px",
                }}>
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                          style={{ color: m.role === "user" ? "#ffcccc" : "#990000", textDecoration: "underline" }}>
                          {children}
                        </a>
                      ),
                      img: ({ src, alt }) => (
                        <img src={src} alt={alt || "listing image"}
                          style={{
                            width: "100%", borderRadius: "8px",
                            marginTop: "6px", objectFit: "cover", maxHeight: "160px"
                          }}
                        />
                      ),
                      p: ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>{children}</ul>,
                      li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: "600" }}>{children}</strong>,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  background: "#f3f4f6", padding: "10px 14px",
                  borderRadius: "14px", borderBottomLeftRadius: "4px"
                }}>
                  <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                    {[0, 1, 2].map((j) => (
                      <span key={j} style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: "#990000", display: "inline-block",
                        animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite`
                      }} />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ color: "#dc2626", fontSize: "12px", textAlign: "center" }}>{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px", borderTop: "1px solid #e5e7eb",
            display: "flex", gap: "8px", background: "#fff"
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={loading}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: "24px",
                border: "1px solid #d1d5db", fontSize: "14px",
                outline: "none", background: "#f9fafb"
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: loading || !input.trim() ? "#d1d5db" : "#990000",
                border: "none", color: "#fff",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >↑</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "56px", height: "56px", borderRadius: "50%",
          background: "#990000", border: "none", color: "#fff",
          fontSize: "24px", cursor: "pointer", zIndex: 1000,
          boxShadow: "0 4px 16px rgba(153,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        title="Chat with Tommy Trojan"
      >
        {isOpen ? "×" : "🤖"}
      </button>
    </>
  );
}