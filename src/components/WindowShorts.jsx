import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
    <section className="shorts" id="thriftvid">
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

/* Media element. The ref + callbacks let the parent drive the seekbar. */
function MediaItem({ item, playing, videoRef, onTime, onMeta, simDuration }) {
  if (item.type === "video") {
    return (
      <video
        ref={videoRef}
        className="shorts-viewer__media"
        src={item.src}
        autoPlay={playing}
        loop muted playsInline
        onTimeUpdate={(e) => onTime?.(e.target.currentTime, e.target.duration)}
        onLoadedMetadata={(e) => onMeta?.(e.target.duration)}
      />
    );
  }
  // Images have no real duration: a simulated timeline drives the seekbar.
  return <img className="shorts-viewer__media" src={item.src} alt={item.account} />;
}

/* Custom like icon (provided asset). Uses currentColor so the green
   active state and the click animation continue to apply. */
function LikeIcon({ size = 22 }) {
  return (
    <svg viewBox="0 0 15068.96 15068.96" width={size} height={size} aria-hidden="true">
      <path d="M1740.84 6053c0,2460.37 2985.52,4509.13 4661.35,5788.37 450.07,300.03 610.19,455.01 1211.66,455.01 432.91,0 766.77,-264.31 1037.01,-444.46 2217.7,-1478.37 5577.68,-4222.17 4439.51,-7095.55 -814.79,-2056.98 -3465.26,-2694.97 -5059.88,-1090.96 -99.66,100.24 -433.09,399.19 -469.55,535.74 -29.85,0 -595.48,-619.38 -763.36,-744.58 -2255.57,-1682.03 -5056.74,-90.22 -5056.74,2596.43z" />
    </svg>
  );
}

/* Right-side action rail: Like / Comment / Share */
function ActionRail({ liked, likeBump, onLike, onComment }) {
  return (
    <div className="shorts-viewer__actions">
      <button
        className={`shorts-action ${liked ? "shorts-action--liked" : ""} ${likeBump ? "shorts-action--bump" : ""}`}
        onClick={onLike}
        aria-label="Like"
      >
        <LikeIcon size={22} />
      </button>
      <button className="shorts-action" onClick={onComment} aria-label="Comment">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" />
        </svg>
      </button>
      <button className="shorts-action" aria-label="Share">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="18" cy="5" r="2.4" />
          <circle cx="6" cy="12" r="2.4" />
          <circle cx="18" cy="19" r="2.4" />
          <path d="M8.1 10.9l7.8-4.6M8.1 13.1l7.8 4.6" stroke="currentColor" strokeWidth="1.8" fill="none" />
        </svg>
      </button>
    </div>
  );
}

/* Bottom overlay bar: avatar + title + username, with a green seekbar */
function VideoOverlay({ item, progress, onSeek }) {
  const barRef = useRef(null);
  const draggingRef = useRef(false);

  const seekFromEvent = useCallback((clientX) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio);
  }, [onSeek]);

  useEffect(() => {
    function move(e) {
      if (!draggingRef.current) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      seekFromEvent(x);
    }
    function up() { draggingRef.current = false; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [seekFromEvent]);

  function startDrag(e) {
    e.stopPropagation();
    draggingRef.current = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    seekFromEvent(x);
  }

  return (
    <>
      {/* Interactive green seekbar pinned to the bottom of the video */}
      <div
        className="shorts-seekbar"
        ref={barRef}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onClick={(e) => e.stopPropagation()}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="shorts-seekbar__fill" style={{ width: `${progress * 100}%` }}>
          <span className="shorts-seekbar__thumb" />
        </div>
      </div>

      {/* Title / username / profile picture bar */}
      <div className="shorts-meta">
        <img className="shorts-meta__avatar" src={item.avatar} alt={item.username} />
        <div className="shorts-meta__text">
          <span className="shorts-meta__title">{item.title || item.account}</span>
          <span className="shorts-meta__username">{item.username}</span>
        </div>
      </div>
    </>
  );
}

/* Comment panel overlay */
function CommentPanel({ comments, onClose }) {
  return (
    <div className="shorts-comments" onClick={(e) => e.stopPropagation()}>
      <div className="shorts-comments__head">
        <span className="shorts-comments__title">Comments</span>
        <button className="shorts-comments__close" onClick={onClose} aria-label="Close comments">×</button>
      </div>
      <div className="shorts-comments__list">
        {comments.length === 0 ? (
          <p className="shorts-comments__empty">Be the first to comment!</p>
        ) : (
          comments.map((c, i) => (
            <div className="shorts-comment" key={i}>
              <img className="shorts-comment__avatar" src={c.avatar} alt={c.user} />
              <div className="shorts-comment__body">
                <span className="shorts-comment__user">{c.user}</span>
                <span className="shorts-comment__text">{c.text}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShortsViewer({ items, initialIndex, onClose }) {
  // current = visible item, prev = outgoing item during transition
  const [current, setCurrent] = useState(initialIndex);
  const [prev, setPrev] = useState(null);
  const [direction, setDirection] = useState(null); // "next" | "prev"
  const [animating, setAnimating] = useState(false);

  // Interaction state
  const [liked, setLiked] = useState({});       // index -> bool
  const [likeBump, setLikeBump] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);   // 0..1 for the seekbar
  const [paused, setPaused] = useState(false);    // single-click play/pause
  const [heartBurst, setHeartBurst] = useState(false); // double-click like animation

  const clickTimer = useRef(null); // distinguishes single vs double click

  const videoRef = useRef(null);
  const indexRef = useRef(initialIndex);
  const animatingRef = useRef(false);
  const touchStartY = useRef(0);
  const accumulated = useRef(0);
  const lastNav = useRef(0);

  // Simulated timeline for image items (which have no real duration)
  const SIM_DURATION = 8; // seconds
  const simTime = useRef(0);
  const seekingRef = useRef(false);

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
    setProgress(0);
    simTime.current = 0;
    setShowComments(false);
    setPaused(false);
    setHeartBurst(false);

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

  // Drive the seekbar for image items via a simulated timeline.
  useEffect(() => {
    if (items[current]?.type === "video") return;
    const interval = setInterval(() => {
      if (seekingRef.current) return;
      simTime.current = (simTime.current + 0.1) % SIM_DURATION;
      setProgress(simTime.current / SIM_DURATION);
    }, 100);
    return () => clearInterval(interval);
  }, [current, items]);

  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY; }
  function handleTouchEnd(e) {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 40) goTo(indexRef.current + 1);
    else if (diff < -40) goTo(indexRef.current - 1);
  }

  function handleVideoTime(time, duration) {
    if (seekingRef.current || !duration) return;
    setProgress(time / duration);
  }

  // Seek handler shared by the seekbar (ratio 0..1)
  function handleSeek(ratio) {
    setProgress(ratio);
    const item = items[current];
    if (item.type === "video" && videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = ratio * videoRef.current.duration;
    } else {
      simTime.current = ratio * SIM_DURATION;
    }
  }

  function toggleLike() {
    setLiked((prev) => ({ ...prev, [current]: !prev[current] }));
    setLikeBump(true);
    setTimeout(() => setLikeBump(false), 320);
  }

  // Single click on the media toggles play/pause (for videos) and shows
  // a brief pause indicator. Double click likes the video.
  function togglePlayback() {
    const vid = videoRef.current;
    if (vid) {
      if (vid.paused) {
        vid.play();
        setPaused(false);
      } else {
        vid.pause();
        setPaused(true);
      }
    } else {
      // Image item: just toggle the pause indicator (timeline already loops)
      setPaused((p) => !p);
    }
  }

  // Double click always sets the video to liked (never un-likes) and plays
  // a heart burst over the video, like common short-video apps.
  function likeFromDoubleClick() {
    setLiked((prev) => ({ ...prev, [current]: true }));
    setLikeBump(true);
    setTimeout(() => setLikeBump(false), 320);
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 700);
  }

  // Distinguish a single click (pause) from a double click (like) using a
  // short delay: a second click within the window cancels the pause.
  function handleMediaClick() {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      likeFromDoubleClick();
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      togglePlayback();
    }, 230);
  }

  const item = items[current];
  // No real comment backend: start every video with an empty list so the
  // required "Be the first to comment!" placeholder shows.
  const comments = [];

  return createPortal(
    <div
      className="shorts-viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button className="shorts-viewer__close" onClick={onClose}>×</button>

      <div className="shorts-viewer__frame">
        <div className="shorts-viewer__stage">

          {/* Outgoing item — exits while incoming enters */}
          {animating && prev !== null && (
            <div className={`shorts-viewer__item shorts-viewer__item--exit-${direction}`}>
              <MediaItem item={items[prev]} playing={false} />
            </div>
          )}

          {/* Incoming / current item */}
          <div className={`shorts-viewer__item ${animating ? `shorts-viewer__item--enter-${direction}` : ""}`}>
            <div
              className="shorts-viewer__clickzone"
              onClick={handleMediaClick}
            >
              <MediaItem
                item={item}
                playing={!animating}
                videoRef={videoRef}
                onTime={handleVideoTime}
              />
              {/* Pause indicator (single click) */}
              {paused && !animating && (
                <div className="shorts-viewer__pause" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="34" height="34">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                </div>
              )}
              {/* Heart burst (double click to like) */}
              {heartBurst && (
                <div className="shorts-viewer__burst" aria-hidden="true">
                  <LikeIcon size={96} />
                </div>
              )}
            </div>
            {!animating && (
              <VideoOverlay item={item} progress={progress} onSeek={(r) => { seekingRef.current = true; handleSeek(r); setTimeout(() => { seekingRef.current = false; }, 50); }} />
            )}
          </div>

        </div>

        {/* Right-side action rail anchored to the stage edge */}
        {!animating && (
          <ActionRail
            liked={!!liked[current]}
            likeBump={likeBump}
            onLike={toggleLike}
            onComment={() => setShowComments((s) => !s)}
          />
        )}
      </div>

      {showComments && (
        <CommentPanel comments={comments} onClose={() => setShowComments(false)} />
      )}

      {current > 0 && (
        <button className="shorts-viewer__prev" onClick={() => goTo(current - 1)}>↑</button>
      )}
      {current < items.length - 1 && (
        <button className="shorts-viewer__next" onClick={() => goTo(current + 1)}>↓</button>
      )}
    </div>,
    document.body
  );
}
