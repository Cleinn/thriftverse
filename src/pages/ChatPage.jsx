import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { fetchSellerProfile } from "../lib/profiles";
import { sendChatMessage, subscribeToMessages, subscribeToNewConversations, updateBarterStatus, acceptBarterOffer } from "../lib/chat";
import Navbar from "../components/Navbar";
import BarterCard from "../components/BarterCard";
import { Skeleton } from "../components/Skeleton";
import "./ChatPage.css";
import "./SellerPage.css";

export default function ChatPage({ user, onLoginClick, cartCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialConversationId = location.state?.conversationId || null;

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [buyerNames, setBuyerNames] = useState({});
  const [sellerNames, setSellerNames] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [barterBusy, setBarterBusy] = useState(null);
  const messagesEndRef = useRef(null);

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
        const nameMap = {};
        const enriched = await Promise.all(
          data.map(async (conv) => {
            if (!nameMap[conv.seller_id]) {
              const profile = await fetchSellerProfile(conv.seller_id);
              nameMap[conv.seller_id] = profile.displayName;
            }
            const liveName = nameMap[conv.seller_id];
            if (liveName && liveName !== "Penjual" && conv.seller_name !== liveName) {
              await supabase
                .from("conversations")
                .update({ seller_name: liveName })
                .eq("id", conv.id);
              return { ...conv, seller_name: liveName };
            }
            return conv;
          })
        );
        if (!cancelled) setSellerNames(nameMap);

        if (cancelled) return;
        setConversations(enriched);

        if (initialConversationId) {
          const target = enriched.find((c) => c.id === initialConversationId);
          if (target) setActiveConv(target);
        }

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

    const unsubscribe = subscribeToNewConversations(user.id, (conv) => {
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
      );
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [user, initialConversationId]);

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

    const unsubscribe = subscribeToMessages(
      activeConv.id,
      (msg) => {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      },
      (msg) => {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      }
    );

    return unsubscribe;
  }, [activeConv]);

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

  async function handleBarterDecision(msg, status) {
    setBarterBusy(msg.id);
    let error;
    if (status === "accepted") {
      ({ error } = await acceptBarterOffer({ message: msg, conversation: activeConv }));
    } else {
      ({ error } = await updateBarterStatus({ messageId: msg.id, status }));
    }
    setBarterBusy(null);
    if (error) {
      alert("Gagal memperbarui barter: " + error.message);
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, barter_status: status } : m))
    );
  }

  function getOtherName(conv) {
    if (!user) return "Penjual";
    if (user.id === conv.buyer_id) {
      const live = sellerNames[conv.seller_id];
      if (live && live !== "Penjual") return live;
      return conv.seller_name || "Penjual";
    } else {
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
      <div className="chat-page__body">
        <div className="seller-content seller-chat-layout">
          {}
          <div className="seller-chat-sidebar">
            <h2 className="seller-chat-sidebar-title">Conversations</h2>
            <div className="seller-chat-sidebar-list">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div className="seller-conv-item" key={i}>
                    <Skeleton width="40px" height="40px" radius="8px" />
                    <div className="seller-conv-item__info">
                      <Skeleton width="65%" height="0.85rem" radius="4px" style={{ marginBottom: "5px" }} />
                      <Skeleton width="45%" height="0.75rem" radius="4px" />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="seller-chat-empty">
                  <p>No chats yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`seller-conv-item ${activeConv?.id === conv.id ? "seller-conv-item--active" : ""}`}
                    onClick={() => setActiveConv(conv)}
                  >
                    <img
                      src={conv.product_image || "https://placehold.co/40x40"}
                      alt={conv.product_title}
                      className="seller-conv-item__img"
                    />
                    <div className="seller-conv-item__info">
                      <span className="seller-conv-item__name">{getOtherName(conv)}</span>
                      <span className="seller-conv-item__product">{conv.product_title}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {}
          <div className={`seller-chat-main ${activeConv ? "seller-chat-main--open" : ""}`}>
            {!activeConv ? (
              <div className="seller-chat-placeholder">
                <p>Select a conversation to start chatting.</p>
              </div>
            ) : (
              <>
                <div className="seller-chat-header">
                  <img
                    src={activeConv.product_image || "https://placehold.co/36x36"}
                    alt={activeConv.product_title}
                    className="seller-conv-item__img"
                  />
                  <div className="seller-chat-header__info">
                    <p className="seller-chat-header__name">{getOtherName(activeConv)}</p>
                    <p className="seller-chat-header__product">{activeConv.product_title}</p>
                  </div>
                </div>

                <div className="seller-chat-messages">
                  {messages.length === 0 && (
                    <p className="seller-chat-empty-msg">Mulai percakapan tentang barang ini!</p>
                  )}
                  {messages.map((msg) =>
                    msg.message_type === "barter" ? (
                      <div
                        key={msg.id}
                        className={`seller-bubble seller-bubble--barter ${
                          msg.sender_id === user.id ? "seller-bubble--me" : "seller-bubble--them"
                        }`}
                      >
                        <BarterCard
                          msg={msg}
                          isSeller={activeConv.seller_id === user.id}
                          busy={barterBusy === msg.id}
                          onAccept={() => handleBarterDecision(msg, "accepted")}
                          onReject={() => handleBarterDecision(msg, "rejected")}
                        />
                        <span className="seller-bubble__time">
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={msg.id}
                        className={`seller-bubble ${msg.sender_id === user.id ? "seller-bubble--me" : "seller-bubble--them"}`}
                      >
                        <p>{msg.message_text}</p>
                        <span className="seller-bubble__time">
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="seller-chat-input-area">
                  <textarea
                    className="seller-chat-input"
                    placeholder="Tulis pesan..."
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className="seller-chat-send"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    aria-label="Kirim"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M3 11l18-8-8 18-2-7-8-3z" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
