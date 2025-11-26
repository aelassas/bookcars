import React, { useState } from "react"
import "@/assets/css/partner-showcase.css"

const PartnerShowcase = () => {
  const [selectedTab, setSelectedTab] = useState("brands")

  const brands = [
    { name: "Toyota", logo: "🚗" },
    { name: "Lexus", logo: "👑" },
    { name: "Mercedes", logo: "⭐" },
    { name: "BMW", logo: "🎯" },
    { name: "Audi", logo: "🏆" },
    { name: "Porsche", logo: "🏁" },
    { name: "Honda", logo: "✨" },
    { name: "Mazda", logo: "🌟" },
  ]

  const testimonials = [
    {
      name: "Sarah Anderson",
      role: "Business Traveler",
      text: "Excellent service! The booking process was smooth and the car was impeccable.",
      rating: 5,
    },
    {
      name: "John Smith",
      role: "Tourist",
      text: "Amazing experience exploring Tokyo in a luxury car. Highly recommended!",
      rating: 5,
    },
    {
      name: "Emma Wilson",
      role: "Corporate Client",
      text: "Professional team, premium vehicles, and unbeatable prices. Perfect!",
      rating: 5,
    },
  ]

  return (
    <section className="partner-showcase">
      <div className="partner-showcase-container">
        {/* Tabs */}
        <div className="partner-showcase-tabs">
          <button
            onClick={() => setSelectedTab("brands")}
            className={`partner-showcase-tab ${selectedTab === "brands" ? "partner-showcase-tab-active" : ""}`}
          >
            Our Fleet
          </button>
          <button
            onClick={() => setSelectedTab("testimonials")}
            className={`partner-showcase-tab ${selectedTab === "testimonials" ? "partner-showcase-tab-active" : ""}`}
          >
            Customer Reviews
          </button>
        </div>

        {/* Brands Tab */}
        {selectedTab === "brands" && (
          <div>
            <h2 className="partner-showcase-title">Premium Vehicle Brands</h2>
            <p className="partner-showcase-subtitle">
              Choose from our curated selection of luxury and reliable vehicles
            </p>
            <div className="partner-showcase-brands-grid">
              {brands.map((brand, index) => (
                <div
                  key={index}
                  className="partner-showcase-brand-card"
                >
                  <div className="partner-showcase-brand-logo">{brand.logo}</div>
                  <p className="partner-showcase-brand-name">{brand.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials Tab */}
        {selectedTab === "testimonials" && (
          <div>
            <h2 className="partner-showcase-title">What Our Customers Say</h2>
            <p className="partner-showcase-subtitle">
              Join thousands of satisfied customers who've experienced premium car rentals with us
            </p>
            <div className="partner-showcase-testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="partner-showcase-testimonial-card"
                >
                  <div className="partner-showcase-rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="partner-showcase-star">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="partner-showcase-testimonial-text">"{testimonial.text}"</p>
                  <div>
                    <p className="partner-showcase-testimonial-name">{testimonial.name}</p>
                    <p className="partner-showcase-testimonial-role">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default PartnerShowcase
