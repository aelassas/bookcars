import React from "react"
import { Zap, Shield, Clock, DollarSign } from "lucide-react"
import "@/v2/assets/css/feature-cards.css"

const FeatureCards = () => {
  const features = [
    {
      icon: Zap,
      title: "Easy Booking",
      description: "Reserve your car in just 2 minutes with our intuitive booking system",
    },
    {
      icon: Shield,
      title: "Full Coverage",
      description: "Comprehensive insurance included with every rental at no extra cost",
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Our multilingual team is always ready to help you anytime",
    },
    {
      icon: DollarSign,
      title: "Best Prices",
      description: "Price match guarantee—if you find a lower rate, we'll beat it",
    },
  ]

  return (
    <section className="feature-cards">
      <div className="feature-cards-container">
        <div className="feature-cards-header">
          <h2 className="feature-cards-title">Why Choose Tokyo Drive?</h2>
          <p className="feature-cards-description">
            We're committed to delivering the best car rental experience in Tokyo with premium service and competitive
            pricing
          </p>
        </div>

        <div className="feature-cards-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="feature-card"
              >
                <div className="feature-card-icon-wrapper">
                  <Icon className="feature-card-icon" size={24} />
                </div>
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-description">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FeatureCards

