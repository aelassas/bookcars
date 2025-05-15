const routes = {
  create: '/api/create-dress',
  update: '/api/update-dress',
  delete: '/api/delete-dress/:id',
  createImage: '/api/create-dress-image',
  updateImage: '/api/update-dress-image/:id',
  deleteImage: '/api/delete-dress-image/:id',
  deleteTempImage: '/api/delete-temp-dress-image/:image',
  getDress: '/api/dress/:id/:language',
  getDresses: '/api/dresses/:page/:size',
  getBookingDresses: '/api/booking-dresses/:page/:size',
  getFrontendDresses: '/api/frontend-dresses/:page/:size',
  checkDress: '/api/check-dress/:id',
}

export default routes