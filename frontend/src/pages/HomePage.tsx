import React from "react"
import Navigation from "@/components/Navigation"
import HeroSection from "@/components/HeroSection"
import BookingWidget from "@/components/BookingWidget"
import FeatureCards from "@/components/FeatureCards"
import PartnerShowcase from "@/components/PartnerShowcase"
import HomeFooter from "@/components/HomeFooter"
import "@/assets/css/home-theme.css"
import "@/assets/css/home.css"

const HomePage = () => {
    return (
        <main className="home-main">
            <Navigation />
            <HeroSection />
            <BookingWidget />
            <FeatureCards />
            <PartnerShowcase />
            <HomeFooter />
        </main>
    )
}

export default HomePage

