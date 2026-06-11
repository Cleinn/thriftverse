import { useState, useRef, useEffect } from "react";
import { shortsData } from "../data/shortsData";
import "./WindowShorts.css";

export default function WindowShorts() {
  const [activeIndex, setActiveIndex] = useState(null);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <section className="shorts">
      <h2 className="shorts__title">Featured ThriftVid</h2>
      <div className="shorts__track">
        {shortsData.map((item, index) => (
          <button key={item.id} className="shorts__card" onClick={() => setActiveIndex(index)}>
            <img src={item.thumbnail} alt={item.account} className="shorts__thumbnail" />
            <span className="shorts__badge">{item.label}</span>
            <div className="shorts__overlay">
              <span className="shorts__account">{item.account}</span>
            </div>
          </button>
        ))}
      </div>

      {isOpen && (
        <ShortsViewer
          items={shortsData}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </section>
  );
}

function MediaItem({ item, playing }) {
  return item.type === "video" ? (
    <video
      className="shorts-viewer__media"
      src={item.src}
      autoPlay={playing}
      loop muted playsInline controls
    />
  ) : (
    <img className="shorts-viewer__media" src={item.src} alt={item.account} />
  );
}

function ShortsViewer({ items, initialIndex, onClose }) {
  // current = visible item, prev = outgoing item during transition
  const [current, setCurrent] = useState(initialIndex);
  const [prev, setPrev] = useState(null);
  const [direction, setDirection] = useState(null); // "next" | "prev"
  const [animating, setAnimating] = useState(false);

  const indexRef = useRef(initialIndex);
  const animatingRef = useRef(false);
  const touchStartY = useRef(0);
  const accumulated = useRef(0);
  const lastNav = useRef(0);
  const NAV_COOLDOWN = 1350;
  const THRESHOLD = 50;
  const ANIM_DURATION = 420;

  function goTo(next) {
    const clamped = Math.max(0, Math.min(next, items.length - 1));
    if (clamped === indexRef.current || animatingRef.current) return;

    const dir = clamped > indexRef.current ? "next" : "prev";
    animatingRef.current = true;
    lastNav.current = Date.now();
    accumulated.current = 0;

    setPrev(indexRef.current);
    setDirection(dir);
    setAnimating(true);
    indexRef.current = clamped;
    setCurrent(clamped);

    setTimeout(() => {
      setPrev(null);
      setDirection(null);
      setAnimating(false);
      animatingRef.current = false;
    }, ANIM_DURATION);
  }

  useEffect(() => {
    function handleWheel(e) {
      e.preventDefault();
      if (Date.now() - lastNav.current < NAV_COOLDOWN) {
        accumulated.current = 0;
        return;
      }
      accumulated.current += e.deltaY;
      if (accumulated.current >= THRESHOLD) {
        accumulated.current = 0;
        goTo(indexRef.current + 1);
      } else if (accumulated.current <= -THRESHOLD) {
        accumulated.current = 0;
        goTo(indexRef.current - 1);
      }
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") goTo(indexRef.current + 1);
      if (e.key === "ArrowUp") goTo(indexRef.current - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY; }
  function handleTouchEnd(e) {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 40) goTo(indexRef.current + 1);
    else if (diff < -40) goTo(indexRef.current - 1);
  }

  return (
    <div
      className="shorts-viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button className="shorts-viewer__close" onClick={onClose}>×</button>

      <div className="shorts-viewer__stage">

        {/* Outgoing item — exits while incoming enters */}
        {animating && prev !== null && (
          <div className={`shorts-viewer__item shorts-viewer__item--exit-${direction}`}>
            <MediaItem item={items[prev]} playing={false} />
            <div className="shorts-viewer__info">
              <span className="shorts-viewer__badge">{items[prev].label}</span>
              <span className="shorts-viewer__account">{items[prev].account}</span>
            </div>
          </div>
        )}

        {/* Incoming item — enters from the appropriate direction */}
        <div className={`shorts-viewer__item ${animating ? `shorts-viewer__item--enter-${direction}` : ""}`}>
          <MediaItem item={items[current]} playing={!animating} />
          <div className="shorts-viewer__info">
            <span className="shorts-viewer__badge">{items[current].label}</span>
            <span className="shorts-viewer__account">{items[current].account}</span>
          </div>
        </div>

      </div>

      {current > 0 && (
        <button className="shorts-viewer__prev" onClick={() => goTo(current - 1)}>↑</button>
      )}
      {current < items.length - 1 && (
        <button className="shorts-viewer__next" onClick={() => goTo(current + 1)}>↓</button>
      )}
    </div>
  );
}
