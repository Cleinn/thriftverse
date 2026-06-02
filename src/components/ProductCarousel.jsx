import { useRef, useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import { fetchProducts } from "../data/products";
import "./ProductCarousel.css";

export default function ProductCarousel() {
  const [products, setProducts] = useState([]);
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError("Failed to load products."));
  }, []);

  function scrollByAmount(direction) {
    scrollRef.current.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

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
      <h2 className="carousel__title">Recommended For You</h2>
      <div className="carousel__wrapper">
        <button className="carousel__arrow carousel__arrow--left" onClick={() => scrollByAmount(-1)}>‹</button>
        <div
          ref={scrollRef}
          className="carousel__track"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {products.length === 0 ? (
            <p style={{ color: '#888', fontSize: 13, padding: '8px 0' }}>Loading products...</p>
          ) : (
            products.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))
          )}
        </div>
        <button className="carousel__arrow carousel__arrow--right" onClick={() => scrollByAmount(1)}>›</button>
      </div>
    </section>
  );
}