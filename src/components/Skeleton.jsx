import "./Skeleton.css";

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

export function SkeletonList({ count = 6, children }) {
  return Array.from({ length: count }).map((_, i) => (
    <span key={i} style={{ display: "contents" }}>
      {children}
    </span>
  ));
}
