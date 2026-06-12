import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "./ProductCard";
import { SkeletonProductCard } from "./Skeleton";
import { fetchProducts } from "../data/products";
import "./ProductCarousel.css";

export default function ProductCarousel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchProducts()
      .then((data) => setProducts(data || []))
      .finally(() => setLoading(false));
  }, []);

  // Filter by the active category from the URL (case-insensitive).
  // "All" / no category shows everything.
  const visibleProducts =
    category && category !== "All"
      ? products.filter(
          (p) =>
            (p.category || "").toLowerCase() === category.toLowerCase()
        )
      : products;

  function handleMouseDown(e) {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  return (
    <section className="carousel">
      <h2 className="carousel__title">
        {category && category !== "All" ? `${category}'s Picks` : "Recommended For You"}
      </h2>
      <div className="carousel__wrapper">
        <div
          ref={scrollRef}
          className="carousel__track"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))
          ) : visibleProducts.length === 0 ? (
            <p className="carousel__empty">Belum ada produk di kategori ini.</p>
          ) : (
            visibleProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
