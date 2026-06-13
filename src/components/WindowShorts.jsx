import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { shortsData } from "../data/shortsData";
import {
  fetchShortsComments,
  postShortsComment,
  subscribeToShortsComments,
} from "../lib/shortsComments";
import "./WindowShorts.css";

export default function WindowShorts({ user }) {
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
          <ShortsCard key={item.id} item={item} onOpen={() => setActiveIndex(index)} />
        ))}
      </div>

      {isOpen && (
        <ShortsViewer
          items={shortsData}
          initialIndex={activeIndex}
          user={user}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </section>
  );
}

function ShortsCard({ item, onOpen }) {
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (item.type !== "video") return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.type]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (inView) {
      const p = vid.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      vid.pause();
    }
  }, [inView]);

  return (
    <button ref={cardRef} className="shorts__card" onClick={onOpen}>
      {item.type === "video" ? (
        <video
          ref={videoRef}
          className="shorts__thumbnail"
          src={item.src}
          poster={item.thumbnail}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
          tabIndex={-1}
        />
      ) : (
        <img src={item.thumbnail} alt={item.account} className="shorts__thumbnail" />
      )}
      <span className="shorts__badge">{item.label}</span>
      <div className="shorts__overlay">
        <span className="shorts__account">{item.account}</span>
      </div>
    </button>
  );
}

function MediaItem({ item, playing, videoRef, onTime, onMeta }) {
  const localRef = useRef(null);
  const setRefs = (node) => {
    localRef.current = node;
    if (videoRef) videoRef.current = node;
  };

  useEffect(() => {
    if (item.type !== "video") return;
    const vid = localRef.current;
    if (!vid) return;
    if (playing) {
      const p = vid.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      vid.pause();
    }
  }, [playing, item.type, item.src]);

  if (item.type === "video") {
    return (
      <video
        ref={setRefs}
        className="shorts-viewer__media"
        src={item.src}
        loop
        muted
        playsInline
        onTimeUpdate={(e) => onTime?.(e.target.currentTime, e.target.duration)}
        onLoadedMetadata={(e) => onMeta?.(e.target.duration)}
      />
    );
  }
  return <img className="shorts-viewer__media" src={item.src} alt={item.account} />;
}

function LikeIcon({ size = 22 }) {
  return (
    <svg viewBox="0 0 15068.96 15068.96" width={size} height={size} aria-hidden="true">
      <path d="M1740.84 6053c0,2460.37 2985.52,4509.13 4661.35,5788.37 450.07,300.03 610.19,455.01 1211.66,455.01 432.91,0 766.77,-264.31 1037.01,-444.46 2217.7,-1478.37 5577.68,-4222.17 4439.51,-7095.55 -814.79,-2056.98 -3465.26,-2694.97 -5059.88,-1090.96 -99.66,100.24 -433.09,399.19 -469.55,535.74 -29.85,0 -595.48,-619.38 -763.36,-744.58 -2255.57,-1682.03 -5056.74,-90.22 -5056.74,2596.43z" />
    </svg>
  );
}

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
      {}
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

      {}
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

function CommentPanel({ videoId, user, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const listEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchShortsComments(videoId).then((data) => {
      if (!cancelled) {
        setComments(data);
        setLoading(false);
      }
    });
    const unsubscribe = subscribeToShortsComments(videoId, (c) => {
      setComments((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c]));
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [videoId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handlePost() {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    if (!user) {
      alert("Login dulu untuk berkomentar.");
      return;
    }
    setPosting(true);
    const username =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const { data, error } = await postShortsComment({
      videoId,
      userId: user.id,
      username,
      text: trimmed,
    });
    setPosting(false);
    if (error) {
      alert("Gagal mengirim komentar: " + error.message);
      return;
    }
    setText("");
    if (data) {
      setComments((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data]));
    }
  }

  return (
    <div className="shorts-comments" onClick={(e) => e.stopPropagation()}>
      <div className="shorts-comments__head">
        <span className="shorts-comments__title">Comments</span>
        <button className="shorts-comments__close" onClick={onClose} aria-label="Close comments">
          &#215;
        </button>
      </div>

      <div className="shorts-comments__list">
        {loading ? (
          <p className="shorts-comments__empty">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="shorts-comments__empty">Be the first to comment!</p>
        ) : (
          comments.map((c) => (
            <div className="shorts-comment" key={c.id}>
              <div className="shorts-comment__body">
                <span className="shorts-comment__user">{c.username || "User"}</span>
                <span className="shorts-comment__text">{c.text}</span>
              </div>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      <div className="shorts-comments__input-area">
        <input
          className="shorts-comments__input"
          placeholder={user ? "Add a comment..." : "Login to comment..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
          disabled={!user || posting}
        />
        <button
          className="shorts-comments__post"
          onClick={handlePost}
          disabled={!user || posting || !text.trim()}
        >
          {posting ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}

function ShortsViewer({ items, initialIndex, user, onClose }) {
  const [current, setCurrent] = useState(initialIndex);
  const [prev, setPrev] = useState(null);
  const [direction, setDirection] = useState(null);
  const [animating, setAnimating] = useState(false);

  const [liked, setLiked] = useState({});
  const [likeBump, setLikeBump] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  const clickTimer = useRef(null);

  const videoRef = useRef(null);
  const indexRef = useRef(initialIndex);
  const animatingRef = useRef(false);
  const touchStartY = useRef(0);
  const accumulated = useRef(0);
  const lastNav = useRef(0);

  const SIM_DURATION = 8;
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
      setPaused((p) => !p);
    }
  }

  function likeFromDoubleClick() {
    setLiked((prev) => ({ ...prev, [current]: true }));
    setLikeBump(true);
    setTimeout(() => setLikeBump(false), 320);
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 700);
  }

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

  return createPortal(
    <div
      className="shorts-viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button className="shorts-viewer__close" onClick={onClose}>×</button>

      <div className={`shorts-viewer__frame ${showComments ? "shorts-viewer__frame--comments" : ""}`}>
        <div className="shorts-viewer__stage">

          {}
          {animating && prev !== null && (
            <div className={`shorts-viewer__item shorts-viewer__item--exit-${direction}`}>
              <MediaItem item={items[prev]} playing={false} />
            </div>
          )}

          {}
          <div className={`shorts-viewer__item ${animating ? `shorts-viewer__item--enter-${direction}` : ""}`}>
            <div
              className="shorts-viewer__clickzone"
              onClick={handleMediaClick}
            >
              <MediaItem
                key={item.id}
                item={item}
                playing={!animating}
                videoRef={videoRef}
                onTime={handleVideoTime}
              />
              {}
              {paused && !animating && (
                <div className="shorts-viewer__pause" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="34" height="34">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                </div>
              )}
              {}
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

        {}
        {!animating && (
          <ActionRail
            liked={!!liked[current]}
            likeBump={likeBump}
            onLike={toggleLike}
            onComment={() => setShowComments((s) => !s)}
          />
        )}

        {}
        {showComments && (
          <CommentPanel
            videoId={item.id}
            user={user}
            onClose={() => setShowComments(false)}
          />
        )}
      </div>

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
