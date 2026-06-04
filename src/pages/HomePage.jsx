import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner";
import ProductCarousel from "../components/ProductCarousel";
import "./HomePage.css";

export default function HomePage({
  onLoginClick,
  onRegisterClick,
  user,
  onProfileClick,
  onSellerClick,
  onLogout,
}) {
  return (
    <div className="page">
      <Navbar onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
        user={user}
        onProfileClick={onProfileClick}
        onSellerClick={onSellerClick}
        onLogout={onLogout} />
      <HeroBanner />
      <ProductCarousel />
    </div>
  );
}