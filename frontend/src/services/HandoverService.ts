import axiosInstance from './axiosInstance'
import * as bookcarsTypes from ':bookcars-types'

export const getByBooking = (bookingId: string): Promise<bookcarsTypes.Handover | null> =>
  axiosInstance.get(`/api/handover/${bookingId}`).then((res) => res.data)
