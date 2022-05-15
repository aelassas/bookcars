export default {
    create: '/api/create-car',
    update: '/api/update-car',
    delete: '/api/delete-car/:id',
    createImage: '/api/create-car-image',
    updateImage: '/api/update-car-image/:id',
    deleteImage: '/api/delete-car-image/:id',
    deleteTempImage: '/api/delete-temp-car-image/:image',
    getCar: '/api/get-car/:id',
    getCars: '/api/get-cars/:page/:size',
    getBookingCars: '/api/get-booking-cars/:page/:size',
}