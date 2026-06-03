import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner";
import ProductCarousel from "../components/ProductCarousel";
import "./HomePage.css";

export default function HomePage({ onLoginClick, onRegisterClick, user }) {
  return (
    <div className="page">
      <Navbar onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} user={user} />
      <HeroBanner />
      <ProductCarousel />
    </div>
  );
}