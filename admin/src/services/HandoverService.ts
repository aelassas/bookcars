import axiosInstance from './axiosInstance'
import * as bookcarsTypes from ':bookcars-types'

export const getByBooking = (bookingId: string): Promise<bookcarsTypes.Handover | null> =>
  axiosInstance.get(`/api/handover/${bookingId}`).then((res) => res.data)

export const upsert = (payload: Partial<bookcarsTypes.Handover> & { booking: string }) =>
  axiosInstance.put('/api/handover', payload).then((res) => res.data)

export const uploadPhotos = (files: File[]) => {
  const form = new FormData()
  files.forEach((file) => form.append('photos', file))
  return axiosInstance.post('/api/handover/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data as { photos: string[] })
}
