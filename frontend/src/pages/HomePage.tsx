import React from 'react'
import HeroSection from '@/components/HeroSection'
import BookingWidget from '@/components/BookingWidget'
import FeatureCards from '@/components/FeatureCards'
import PartnerShowcase from '@/components/PartnerShowcase'
import '@/assets/css/home-theme.css'
import '@/assets/css/home.css'

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

