import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner";
import WindowShorts from "../components/WindowShorts";
import ProductCarousel from "../components/ProductCarousel";
import "./HomePage.css";

export default function HomePage({
  onLoginClick,
  onRegisterClick,
  user,
  onProfileClick,
  onSellerClick,
  onPurchasesClick,
  onLogout,
  onCartClick,
  cartCount,
}) {
  return (
    <div className="page">
      <Navbar onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        user={user}
        onProfileClick={onProfileClick}
        onSellerClick={onSellerClick}
        onPurchasesClick={onPurchasesClick}
        onLogout={onLogout}
        onCartClick={onCartClick}
        cartCount={cartCount} />
      <div className="home-content">
        <HeroBanner />
        <WindowShorts user={user} />
        <ProductCarousel />
      </div>
    </div>
  );
}
