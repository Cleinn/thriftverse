import { useState, useRef, useEffect, useCallback } from "react";
import { shortsData } from "../data/shortsData";
import "./WindowShorts.css";

export default function WindowShorts() {
  const [activeIndex, setActiveIndex] = useState(null); // index of opened short, null = closed
  const isOpen = activeIndex !== null;

  function openShort(index) {
    setActiveIndex(index);
  }

  const closeShort = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) =>
      prev === null ? null : Math.min(prev + 1, shortsData.length - 1)
    );
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keyboard navigation (Esc to close, Arrow Up/Down to navigate)
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") closeShort();
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, closeShort, goNext, goPrev]);

  return (
    <section className="shorts">
      <h2 className="shorts__title">Featured ThriftVid</h2>
      <div className="shorts__track">
        {shortsData.map((item, index) => (
          <button
            key={item.id}
            className="shorts__card"
            onClick={() => openShort(index)}
          >
            <img
              src={item.thumbnail}
              alt={item.account}
              className="shorts__thumbnail"
            />
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
          activeIndex={activeIndex}
          onClose={closeShort}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
    </section>
  );
}

function ShortsViewer({ items, activeIndex, onClose, onNext, onPrev }) {
  const containerRef = useRef(null);
  const touchStartY = useRef(0);

  // Scroll the active item into view whenever it changes
  useEffect(() => {
    const node = containerRef.current?.children[activeIndex];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  function handleWheel(e) {
    if (e.deltaY > 30) onNext();
    else if (e.deltaY < -30) onPrev();
  }

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) onNext();
    else if (diff < -50) onPrev();
  }

  return (
    <div className="shorts-viewer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="shorts-viewer__close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div
        className="shorts-viewer__stage"
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`shorts-viewer__item ${
              index === activeIndex ? "shorts-viewer__item--active" : ""
            }`}
          >
            {Math.abs(index - activeIndex) <= 1 && (
              <>
                {item.type === "video" ? (
                  <video
                    className="shorts-viewer__media"
                    src={item.src}
                    autoPlay={index === activeIndex}
                    loop
                    muted
                    playsInline
                    controls={index === activeIndex}
                  />
                ) : (
                  <img
                    className="shorts-viewer__media"
                    src={item.src}
                    alt={item.account}
                  />
                )}
                <div className="shorts-viewer__info">
                  <span className="shorts-viewer__badge">{item.label}</span>
                  <span className="shorts-viewer__account">{item.account}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="shorts-viewer__nav">
        <button onClick={onPrev} disabled={activeIndex === 0} aria-label="Previous">
          ‹
        </button>
        <button
          onClick={onNext}
          disabled={activeIndex === items.length - 1}
          aria-label="Next"
        >
          ›
        </button>
      </div>
    </div>
  );
}