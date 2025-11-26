import React, { useState } from "react"
import { Calendar, MapPin, Users } from "lucide-react"
import "@/v2/assets/css/booking-widget.css"

const BookingWidget = () => {
  const [pickupDate, setPickupDate] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [location, setLocation] = useState("Tokyo Airport (NRT)")
  const [passengers, setPassengers] = useState("2")

  const handleSearch = () => {
    alert(`Searching for cars:\nPickup: ${pickupDate}\nReturn: ${returnDate}\nPassengers: ${passengers}`)
  }

  return (
    <section className="booking-widget">
      <div className="booking-widget-container">
        <div className="booking-widget-card">
          <h2 className="booking-widget-title">Find Your Perfect Ride</h2>

          <div className="booking-widget-form">
            {/* Location */}
            <div className="booking-widget-field">
              <label className="booking-widget-label">
                <MapPin size={16} />
                Pickup Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="booking-widget-select"
              >
                <option>Tokyo Airport (NRT)</option>
                <option>Haneda Airport (HND)</option>
                <option>Shinjuku Station</option>
                <option>Shibuya</option>
              </select>
            </div>

            {/* Pickup Date */}
            <div className="booking-widget-field">
              <label className="booking-widget-label">
                <Calendar size={16} />
                Pickup Date
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="booking-widget-input"
              />
            </div>

            {/* Return Date */}
            <div className="booking-widget-field">
              <label className="booking-widget-label">
                <Calendar size={16} />
                Return Date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="booking-widget-input"
              />
            </div>

            {/* Passengers */}
            <div className="booking-widget-field">
              <label className="booking-widget-label">
                <Users size={16} />
                Passengers
              </label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="booking-widget-select"
              >
                <option value="1">1 Passenger</option>
                <option value="2">2 Passengers</option>
                <option value="3">3 Passengers</option>
                <option value="4">4 Passengers</option>
                <option value="5">5+ Passengers</option>
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="booking-widget-button"
            >
              Search Cars
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BookingWidget

