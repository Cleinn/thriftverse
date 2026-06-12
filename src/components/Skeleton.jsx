import "./Skeleton.css";

/**
 * Skeleton — a single solid grey placeholder block with a shimmer.
 * Pass width/height/radius (any CSS value) or a className for shape
 * helpers (tv-skel--text, --line, --circle, --pill).
 */
export function Skeleton({ width, height, radius, className = "", style = {} }) {
  return (
    <span
      className={`tv-skel ${className}`}
      style={{
        ...(width != null ? { width } : {}),
        ...(height != null ? { height } : {}),
        ...(radius != null ? { borderRadius: radius } : {}),
        ...style,
      }}
    />
  );
}

/**
 * SkeletonProductCard — matches the .product-card footprint used in the
 * carousel and product grids (image block + title/desc/price lines).
 */
export function SkeletonProductCard() {
  return (
    <div className="tv-skel-product">
      <Skeleton className="tv-skel-product__img" />
      <div className="tv-skel-product__body">
        <Skeleton className="tv-skel--text" width="80%" />
        <Skeleton className="tv-skel--line" width="50%" />
        <Skeleton className="tv-skel--text" width="40%" />
      </div>
    </div>
  );
}

/**
 * SkeletonList — repeats a render-prop skeleton `count` times.
 */
export function SkeletonList({ count = 6, children }) {
  return Array.from({ length: count }).map((_, i) => (
    <span key={i} style={{ display: "contents" }}>
      {children}
    </span>
  ));
}
