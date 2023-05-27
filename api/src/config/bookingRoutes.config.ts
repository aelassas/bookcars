export default {
    create: '/api/create-booking',
    book: '/api/book',
    update: '/api/update-booking',
    updateStatus: '/api/update-booking-status',
    delete: '/api/delete-bookings',
    getBooking: '/api/booking/:id/:language',
    getBookings: '/api/bookings/:page/:size/:language',
    hasBookings: '/api/has-bookings/:driver',
    bookingsMinDate: '/api/bookings-min-date/:driver',
    bookingsMaxDate: '/api/bookings-max-date/:driver',
    cancelBooking: '/api/cancel-booking/:id'
}