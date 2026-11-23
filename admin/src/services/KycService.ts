import axiosInstance from './axiosInstance'
import * as bookcarsTypes from ':bookcars-types'

export const getPending = (): Promise<bookcarsTypes.Kyc[]> =>
  axiosInstance.get('/api/kyc/pending').then((res) => res.data)

export const review = (id: string, status: 'approved' | 'rejected' | 'suspended', rejectionReason?: string) =>
  axiosInstance.post(`/api/kyc/${id}/review`, { status, rejectionReason }).then((res) => res.data)
