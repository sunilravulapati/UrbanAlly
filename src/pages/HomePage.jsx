import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiShield, FiMove, FiHeart } from 'react-icons/fi';
import './HomePage.css';

function HomePage() {
  return (
    <div className="homepage-container">
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Urban Ally</h1>
          <p className="hero-subtitle">Navigate your city with confidence and ease. Your guide to safer, more accessible routes is here.</p>
          <Link to="/app" className="hero-cta-button">
            Launch The App <FiArrowRight />
          </Link>
        </div>
      </header>

     <main className="features-section">
        <h2>Features Designed For You</h2>
        <div className="features-grid">
          <Link to="/app/safeRoute" className="feature-card-link">
            <div className="feature-card">
              <FiShield size={40} className="feature-icon" />
              <h3>Safe Route Finder</h3>
              <p>Our intelligent routing helps you avoid pre-defined danger zones, prioritizing your safety on every trip.</p>
            </div>
          </Link>
          <Link to="/app/distanceChecker" className="feature-card-link">
            <div className="feature-card">
              <FiMove size={40} className="feature-icon" />
              <h3>Distance Checker</h3>
              <p>Quickly plan your journeys by calculating the distance and duration between any two points in the city.</p>
            </div>
          </Link>

          <Link to="/app/viewSaved" className="feature-card-link">
            <div className="feature-card">
              <FiHeart size={40} className="feature-icon" />
              <h3>Save Your Routes</h3>
              <p>Keep your frequent and favorite routes just a click away. Save them for quick access anytime you need.</p>
            </div>
          </Link>
        </div>
      </main>

      <footer className="footer">
        <p>&copy; 2025 Urban Ally. Built with Google Maps Platform.</p>
      </footer>
    </div>
  );
}
const style = document.createElement('style');
style.innerHTML = `
  .fade-in {
    animation: fadeInUp 1s ease-out forwards;
    opacity: 0;
  }
`;
document.head.appendChild(style);


export default HomePage;