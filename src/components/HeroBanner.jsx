import heroPng from "../assets/hero.png";
import "./HeroBanner.css";

export default function HeroBanner() {
  return (
    <div className="hero" id="home">
      <img src={heroPng} alt="ThriftVerse banner" className="hero__img" />
    </div>
  );
}
