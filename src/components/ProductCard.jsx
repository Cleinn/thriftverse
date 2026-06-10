import { useNavigate } from "react-router-dom";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/product/${product.product_id}`);
  }

  return (
    <div className="product-card" onClick={handleClick}>
      <div className="product-card__image">
        <img
          src={product.image_url}
          alt={product.title}
        />
      </div>
      <div className="product-info">
        <p className="product-card__name">{product.title}</p>
        <p className="product-card__desc">{product.condition}</p>
        <p className="product-card__price">Rp {Number(product.price).toLocaleString('id-ID')}</p>
      </div>
    </div>
  );
}