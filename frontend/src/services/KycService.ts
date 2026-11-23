import axiosInstance from './axiosInstance'
import * as bookcarsTypes from ':bookcars-types'

export const submit = (payload: Partial<bookcarsTypes.Kyc>) =>
  axiosInstance.post('/api/kyc', payload).then((res) => res.data)

export const getMine = (): Promise<bookcarsTypes.Kyc | null> =>
  axiosInstance.get('/api/kyc/mine').then((res) => res.data)

export const uploadDocuments = (files: {
  documentFront?: File
  documentBack?: File
  selfie?: File
}) => {
  const form = new FormData()
  if (files.documentFront) form.append('documentFront', files.documentFront)
  if (files.documentBack) form.append('documentBack', files.documentBack)
  if (files.selfie) form.append('selfie', files.selfie)
  return axiosInstance.post('/api/kyc/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data as Record<string, string>)
}
