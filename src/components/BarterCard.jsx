import "./BarterCard.css";

export default function BarterCard({ msg, isSeller, onAccept, onReject, busy }) {
  const status = msg.barter_status || "pending";

  return (
    <div className="barter-card">
      <span className="barter-card__tag">Penawaran Barter</span>

      <div className="barter-card__body">
        <img
          src={msg.barter_product_image || "https://placehold.co/64x64"}
          alt={msg.barter_product_title}
          className="barter-card__img"
        />
        <div className="barter-card__info">
          <span className="barter-card__title" title={msg.barter_product_title}>
            {msg.barter_product_title}
          </span>
          {msg.barter_product_price != null && (
            <span className="barter-card__price">
              Rp {Number(msg.barter_product_price).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>

      {status === "pending" ? (
        isSeller ? (
          <div className="barter-card__actions">
            <button
              className="barter-card__btn barter-card__btn--accept"
              onClick={onAccept}
              disabled={busy}
            >
              Accept
            </button>
            <button
              className="barter-card__btn barter-card__btn--reject"
              onClick={onReject}
              disabled={busy}
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="barter-card__status barter-card__status--pending">
            Menunggu respons penjual…
          </span>
        )
      ) : (
        <span
          className={`barter-card__status barter-card__status--${status}`}
        >
          {status === "accepted" ? "Barter diterima" : "Barter ditolak"}
        </span>
      )}
    </div>
  );
}
