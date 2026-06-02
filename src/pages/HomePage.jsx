import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner";
import ProductCarousel from "../components/ProductCarousel";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="page">
      <Navbar />
      <HeroBanner />
      <ProductCarousel />
    </div>
  );
}
