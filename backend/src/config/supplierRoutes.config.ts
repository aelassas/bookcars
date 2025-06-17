const routes = {
  validate: '/api/validate-supplier',
  update: '/api/update-supplier',
  delete: '/api/delete-supplier/:id',
  getSupplier: '/api/supplier/:id',
  getSuppliers: '/api/suppliers/:page/:size',
  getAllSuppliers: '/api/all-suppliers',
  getFrontendSuppliers: '/api/frontend-suppliers',
  getAdminSuppliers: '/api/admin-suppliers',
  createContract: '/api/create-contract/:language',
  updateContract: '/api/update-contract/:id/:language',
  deleteContract: '/api/delete-contract/:id/:language',
  deleteTempContract: '/api/delete-temp-contract/:file',
}

export default routes
