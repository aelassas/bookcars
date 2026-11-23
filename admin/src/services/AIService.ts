import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import env from '@/config/env.config'

export interface BookingIntakeResponse {
  provider: string
  degraded?: boolean
  failureCode?: 'missing_api_key' | 'rate_limited' | 'invalid_api_key' | 'provider_unavailable' | 'local_ai_unavailable' | 'invalid_provider_response'
  originalRequest: string
  auditId: string
  extractedData: bookcarsTypes.BookingIntakeData
}

export const extract = (request: string): Promise<BookingIntakeResponse> =>
  axiosInstance.post('/api/ai/booking-intake', { request }, { withCredentials: true }).then((res) => res.data)

export const getAudits = (page: number, size = env.PAGE_SIZE, filters?: { status?: string, bookingId?: string, minConfidence?: number }): Promise<Array<{ resultData: bookcarsTypes.BookingIntakeAudit[], pageInfo: { totalRecords: number }[] }>> => {
  const params = new URLSearchParams()
  if (filters?.status) {
params.set('status', filters.status)
}
  if (filters?.bookingId) {
params.set('bookingId', filters.bookingId)
}
  if (filters?.minConfidence !== undefined) {
params.set('minConfidence', String(filters.minConfidence))
}
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return axiosInstance.get(`/api/ai/booking-intake-audits/${page}/${size}${suffix}`, { withCredentials: true }).then((res) => res.data)
}

export const approveAudit = (id: string, correctedData: bookcarsTypes.BookingIntakeData): Promise<bookcarsTypes.BookingIntakeAudit> =>
  axiosInstance.post(`/api/ai/booking-intake-audits/${encodeURIComponent(id)}/approve`, { correctedData }, { withCredentials: true }).then((res) => res.data)

export const rejectAudit = (id: string, reason: string): Promise<bookcarsTypes.BookingIntakeAudit> =>
  axiosInstance.post(`/api/ai/booking-intake-audits/${encodeURIComponent(id)}/reject`, { reason }, { withCredentials: true }).then((res) => res.data)

export const markBookingCreated = (id: string, bookingId: string): Promise<bookcarsTypes.BookingIntakeAudit> =>
  axiosInstance.post(`/api/ai/booking-intake-audits/${encodeURIComponent(id)}/booking-created`, { bookingId }, { withCredentials: true }).then((res) => res.data)
