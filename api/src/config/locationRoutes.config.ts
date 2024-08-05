const routes = {
  validate: '/api/validate-location',
  create: '/api/create-location',
  update: '/api/update-location/:id',
  delete: '/api/delete-location/:id',
  getLocation: '/api/location/:id/:language',
  getLocations: '/api/locations/:page/:size/:language',
  getLocationsWithPosition: '/api/locations-with-position/:language',
  checkLocation: '/api/check-location/:id',
  getLocationId: '/api/location-id/:name/:language',
  createImage: '/api/create-location-image',
  updateImage: '/api/update-location-image/:id',
  deleteImage: '/api/delete-location-image/:id',
  deleteTempImage: '/api/delete-temp-location-image/:image',
}

export default routes
