import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import {
  sendChatMessage,
  subscribeToMessages,
  subscribeToNewConversations,
  updateBarterStatus,
} from "../../lib/chat";
import BarterCard from "../BarterCard";
import { Skeleton } from "../Skeleton";

/**
 * Buyer Chats — Seller Center inbox.
 * Conversations are routed here via `conversations.seller_id`, so a
 * seller only ever sees chats addressed to their own shop.
 */
export default function SellerChats({ user }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [buyerNames, setBuyerNames] = useState({});
  const [barterBusy, setBarterBusy] = useState(null); // message id being updated
  const endRef = useRef(null);

  // Load inbox + realtime new conversations
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadInbox() {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled || !data) { setLoading(false); return; }
      setConvs(data);

      const names = {};
      await Promise.all(
        data.map(async (conv) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", conv.buyer_id)
            .maybeSingle();
          // Show the buyer's ACTUAL username. Fall back to full_name only
          // if username is missing, then to a generic label as last resort.
          names[conv.id] = profile?.username || profile?.full_name || "Pembeli";
        })
      );
      if (!cancelled) { setBuyerNames(names); setLoading(false); }
    }
    loadInbox();

    const unsubscribe = subscribeToNewConversations(user.id, (conv) => {
      if (conv.seller_id !== user.id) return;
      setConvs((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

  // Messages + realtime for the open thread
  useEffect(() => {
    if (!activeConv) return;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConv.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs(data || []));

    const unsubscribe = subscribeToMessages(
      activeConv.id,
      (msg) => {
        setMsgs((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      },
      (msg) => {
        setMsgs((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      }
    );
    return unsubscribe;
  }, [activeConv]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function handleSend() {
    if (!input.trim() || !activeConv) return;
    const text = input;
    setInput("");
    await sendChatMessage({ conversationId: activeConv.id, senderId: user.id, text });
  }

  // Seller accepts / rejects a barter offer.
  async function handleBarterDecision(msg, status) {
    setBarterBusy(msg.id);
    const { data, error } = await updateBarterStatus({ messageId: msg.id, status });
    setBarterBusy(null);
    if (error) {
      alert("Gagal memperbarui barter: " + error.message);
      return;
    }
    setMsgs((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, ...(data || { barter_status: status }) } : m))
    );
  }

  return (
    <div className="seller-content seller-chat-layout">
      {/* LEFT: conversation list */}
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
          ) : convs.length === 0 ? (
            <div className="seller-chat-empty">
              <span>💬</span>
              <p>No chats yet</p>
            </div>
          ) : (
            convs.map((conv) => (
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
                  <span className="seller-conv-item__name">
                    {buyerNames[conv.id] || "Pembeli"}
                  </span>
                  <span className="seller-conv-item__product">
                    {conv.product_title}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: thread */}
      <div className={`seller-chat-main ${activeConv ? "seller-chat-main--open" : ""}`}>
        {!activeConv ? (
          <div className="seller-chat-placeholder">
            <span className="seller-chat-placeholder-icon">💬</span>
            <p>Select a conversation to start chatting with buyers.</p>
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
                <p className="seller-chat-header__name">
                  {buyerNames[activeConv.id] || "Pembeli"}
                </p>
                <p className="seller-chat-header__product">
                  {activeConv.product_title}
                </p>
              </div>
            </div>

            <div className="seller-chat-messages">
              {msgs.length === 0 && (
                <p className="seller-chat-empty-msg">Belum ada pesan.</p>
              )}
              {msgs.map((msg) =>
                msg.message_type === "barter" ? (
                  <div
                    key={msg.id}
                    className={`seller-bubble seller-bubble--barter ${
                      msg.sender_id === user.id ? "seller-bubble--me" : "seller-bubble--them"
                    }`}
                  >
                    <BarterCard
                      msg={msg}
                      isSeller={true}
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
              <div ref={endRef} />
            </div>

            <div className="seller-chat-input-area">
              <textarea
                className="seller-chat-input"
                placeholder="Balas pembeli..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className="seller-chat-send"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
