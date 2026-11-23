import axiosInstance from './axiosInstance'

export const submit = (documentType: 'cnic' | 'passport' | 'driving_license', documentNumber: string) =>
  axiosInstance.post('/api/kyc', { documentType, documentNumber }).then((res) => res.data)

export const getMine = () =>
  axiosInstance.get('/api/kyc/mine').then((res) => res.data)
