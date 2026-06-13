import { useState, useEffect } from "react";
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
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    fetchProducts()
      .then((data) => setProducts(data || []))
      .finally(() => setLoading(false));
  }, []);

  // Filter by the active category from the URL (case-insensitive).
  // "All" / no category shows everything.
  let visibleProducts =
    category && category !== "All"
      ? products.filter(
          (p) => (p.category || "").toLowerCase() === category.toLowerCase()
        )
      : products;

  // Search strictly filters products by title and description.
  if (query) {
    visibleProducts = visibleProducts.filter((p) => {
      const title = (p.title || p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }

  return (
    <section className="carousel" id="catalogue">
      <h2 className="carousel__title">
        {query
          ? `Hasil pencarian "${query}"`
          : category && category !== "All"
          ? `${category}'s Picks`
          : "Recommended For You"}
      </h2>
      {loading ? (
        <div className="carousel__grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <p className="carousel__empty">
          {query
            ? "Tidak ada produk yang cocok dengan pencarian."
            : "Belum ada produk di kategori ini."}
        </p>
      ) : (
        <div className="carousel__grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
