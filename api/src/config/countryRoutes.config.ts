const routes = {
  validate: '/api/validate-country',
  create: '/api/create-country',
  update: '/api/update-country/:id',
  delete: '/api/delete-country/:id',
  getCountry: '/api/country/:id/:language',
  getCountries: '/api/countries/:page/:size/:language',
  getCountriesWithLocations: '/api/countries-with-locations/:language/:imageRequired/:minLocations',
  checkCountry: '/api/check-country/:id',
  getCountryId: '/api/country-id/:name/:language',
}

export default routes
