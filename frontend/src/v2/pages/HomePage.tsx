import React from "react"
import HeroSection from "@/v2/components/HeroSection"
import BookingWidget from "@/v2/components/BookingWidget"
import FeatureCards from "@/v2/components/FeatureCards"
import PartnerShowcase from "@/v2/components/PartnerShowcase"
import "@/v2/assets/css/home-theme.css"
import "@/v2/assets/css/home.css"

const HomePage = () => {
    return (
        <main className="home-main">
            <HeroSection />
            <BookingWidget />
            <FeatureCards />
            <PartnerShowcase />
        </main>
    )
}

export default HomePage

