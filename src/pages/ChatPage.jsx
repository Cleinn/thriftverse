import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { fetchSellerProfile } from "../lib/profiles";
import { sendChatMessage, subscribeToMessages, subscribeToNewConversations } from "../lib/chat";
import Navbar from "../components/Navbar";
import "./ChatPage.css";

export default function ChatPage({ user, onLoginClick, cartCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Conversation yang harus langsung dibuka (dikirim dari halaman produk)
  const initialConversationId = location.state?.conversationId || null;

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
    let cancelled = false;

    async function loadConversations() {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!error && data && !cancelled) {
        // Pastikan seller_name = NAMA TOKO (shop_name); backfill bila kosong
        // atau bila masih menyimpan username lama.
        const enriched = await Promise.all(
          data.map(async (conv) => {
            const profile = await fetchSellerProfile(conv.seller_id);
            if (profile.displayName && conv.seller_name !== profile.displayName) {
              await supabase
                .from("conversations")
                .update({ seller_name: profile.displayName })
                .eq("id", conv.id);
              return { ...conv, seller_name: profile.displayName };
            }
            return conv;
          })
        );

        if (cancelled) return;
        setConversations(enriched);

        // Auto-open conversation dari halaman produk
        if (initialConversationId) {
          const target = enriched.find((c) => c.id === initialConversationId);
          if (target) setActiveConv(target);
        }

        // Untuk percakapan di mana user adalah seller, cari username buyer
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
        if (!cancelled) setBuyerNames(buyerMap);
      }
      if (!cancelled) setLoading(false);
    }

    loadConversations();

    // REALTIME: conversation baru muncul di sidebar tanpa refresh
    const unsubscribe = subscribeToNewConversations(user.id, (conv) => {
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
      );
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [user, initialConversationId]);

  // Fetch messages + realtime subscription when activeConv changes
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

    // REALTIME: pesan masuk/keluar langsung muncul tanpa refresh
    const unsubscribe = subscribeToMessages(activeConv.id, (msg) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    return unsubscribe;
  }, [activeConv]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !activeConv || !user) return;
    const text = input;
    setInput("");
    await sendChatMessage({
      conversationId: activeConv.id,
      senderId: user.id,
      text,
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
      // Buyer melihat NAMA TOKO seller sebagai recipient
      return conv.seller_name || "Penjual";
    } else {
      // Seller melihat username buyer
      return buyerNames[conv.id] || "Pembeli";
    }
  }

  if (!user) {
    return (
      <div className="chat-page tv-page-enter">
        <Navbar onLoginClick={onLoginClick} user={user} cartCount={cartCount} />
        <div className="chat-empty">
          <p>Login dulu untuk mengakses chat.</p>
          <button className="chat-login-btn" onClick={onLoginClick}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page tv-page-enter">
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
            <p className="chat-sidebar__empty"><span className="tv-spinner" /> Memuat...</p>
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
              {/* Header — recipient = nama toko */}
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
