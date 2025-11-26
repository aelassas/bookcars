import React from "react"
import "@/v2/assets/css/hero-section.css"

const HeroSection = () => {
    return (
        <section className="hero-section">
            {/* Background gradient overlay */}
            <div className="hero-section-gradient" />

            <div className="hero-section-container">
                <div className="hero-section-grid">
                    {/* Left Content */}
                    <div className="hero-section-content">
                        <div className="hero-section-title-wrapper">
                            <h1 className="hero-section-title">
                                Premium Car Rentals in Tokyo
                            </h1>
                            <p className="hero-section-description">
                                Experience the freedom to explore Japan with our curated collection of luxury vehicles. Seamless
                                booking, exceptional service, competitive rates.
                            </p>
                        </div>

                        <div className="hero-section-actions">
                            <button className="hero-section-button-primary">
                                Book Now
                                <span>→</span>
                            </button>
                            <button className="hero-section-button-secondary">
                                Explore Fleet
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="hero-section-stats">
                            <div>
                                <div className="hero-section-stat-value">500+</div>
                                <p className="hero-section-stat-label">Vehicles Available</p>
                            </div>
                            <div>
                                <div className="hero-section-stat-value">24/7</div>
                                <p className="hero-section-stat-label">Customer Support</p>
                            </div>
                            <div>
                                <div className="hero-section-stat-value">15k+</div>
                                <p className="hero-section-stat-label">Happy Customers</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Image */}
                    <div className="hero-section-image-wrapper">
                        <img
                            src="/assets/luxury-car-driving-in-tokyo-night-city.jpg"
                            alt="Luxury car rental Tokyo"
                            className="hero-section-image"
                        />
                        <div className="hero-section-badge">
                            ⭐ 4.9/5 Rating
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection

