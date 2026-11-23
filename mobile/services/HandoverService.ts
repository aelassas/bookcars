import axiosInstance from './axiosInstance'

export const getByBooking = (bookingId: string) =>
  axiosInstance.get(`/api/handover/${bookingId}`).then((res) => res.data)
