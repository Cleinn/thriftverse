import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import "./ChatPage.css";

export default function ChatPage({ user, onLoginClick, cartCount }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [buyerNames, setBuyerNames] = useState({}); // conv.id → buyer username
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch all conversations for this user
  useEffect(() => {
    if (!user) return;
    async function loadConversations() {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // For conversations where seller_name is missing, backfill from profiles
        const enriched = await Promise.all(
          data.map(async (conv) => {
            if (!conv.seller_name) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", conv.seller_id)
                .maybeSingle();
              if (profile?.username) {
                // Persist the fix back to DB
                await supabase
                  .from("conversations")
                  .update({ seller_name: profile.username })
                  .eq("id", conv.id);
                return { ...conv, seller_name: profile.username };
              }
            }
            return conv;
          })
        );

        setConversations(enriched);

        // For conversations where current user is the seller,
        // look up the buyer's username from profiles (no buyer_name column exists)
        const buyerMap = {};
        await Promise.all(
          enriched
            .filter((conv) => conv.seller_id === user.id)
            .map(async (conv) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", conv.buyer_id)
                .maybeSingle();
              buyerMap[conv.id] = profile?.username || "Pembeli";
            })
        );
        setBuyerNames(buyerMap);
      }
      setLoading(false);
    }
    loadConversations();
  }, [user]);

  // Fetch messages when activeConv changes
  useEffect(() => {
    if (!activeConv) return;
    async function loadMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv.id)
        .order("created_at", { ascending: true });
      if (!error) setMessages(data || []);
    }
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel("messages:" + activeConv.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeConv]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !activeConv || !user) return;
    const message_text = input.trim();
    setInput("");
    await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      message_text,
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function getOtherName(conv) {
    if (!user) return "Penjual";
    if (user.id === conv.buyer_id) {
      // Current user is the buyer → show seller's username
      return conv.seller_name || "Penjual";
    } else {
      // Current user is the seller → show buyer's username (looked up separately)
      return buyerNames[conv.id] || "Pembeli";
    }
  }

  if (!user) {
    return (
      <div className="chat-page">
        <Navbar onLoginClick={onLoginClick} user={user} cartCount={cartCount} />
        <div className="chat-empty">
          <p>Login dulu untuk mengakses chat.</p>
          <button className="chat-login-btn" onClick={onLoginClick}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <Navbar
        onLoginClick={onLoginClick}
        user={user}
        onCartClick={() => navigate("/cart")}
        cartCount={cartCount}
      />
      <div className="chat-layout">
        {/* Sidebar - conversation list */}
        <aside className="chat-sidebar">
          <h2 className="chat-sidebar__title">Pesan</h2>
          {loading ? (
            <p className="chat-sidebar__empty">Memuat...</p>
          ) : conversations.length === 0 ? (
            <p className="chat-sidebar__empty">Belum ada percakapan.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                className={`chat-conv-item ${activeConv?.id === conv.id ? "chat-conv-item--active" : ""}`}
                onClick={() => setActiveConv(conv)}
              >
                <img
                  src={conv.product_image || "https://placehold.co/48x48"}
                  alt={conv.product_title}
                  className="chat-conv-item__img"
                />
                <div className="chat-conv-item__info">
                  <span className="chat-conv-item__name">{getOtherName(conv)}</span>
                  <span className="chat-conv-item__product">{conv.product_title}</span>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Main chat area */}
        <main className="chat-main">
          {!activeConv ? (
            <div className="chat-placeholder">
              <p>Pilih percakapan untuk mulai chat</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="chat-header">
                <img
                  src={activeConv.product_image || "https://placehold.co/40x40"}
                  alt={activeConv.product_title}
                  className="chat-header__img"
                />
                <div>
                  <p className="chat-header__name">{getOtherName(activeConv)}</p>
                  <p className="chat-header__product">{activeConv.product_title}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 && (
                  <p className="chat-messages__empty">Mulai percakapan tentang barang ini!</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble ${msg.sender_id === user.id ? "chat-bubble--me" : "chat-bubble--them"}`}
                  >
                    <p>{msg.message_text}</p>
                    <span className="chat-bubble__time">
                      {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <textarea
                  className="chat-input"
                  placeholder="Tulis pesan..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className="chat-send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
