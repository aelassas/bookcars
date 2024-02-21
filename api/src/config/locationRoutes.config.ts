const routes = {
  validate: '/api/validate-location',
  create: '/api/create-location',
  update: '/api/update-location/:id',
  delete: '/api/delete-location/:id',
  getLocation: '/api/location/:id/:language',
  getLocations: '/api/locations/:page/:size/:language',
  checkLocation: '/api/check-location/:id',
}

export default routes
