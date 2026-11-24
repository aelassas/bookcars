import axios from 'axios'
import env from '@/config/env.config'

const axiosInstance = axios.create({ baseURL: env.API_HOST, timeout: 30_000 })

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message
      || (status === 401 ? 'Please sign in again.' : status === 403 ? 'You do not have permission to perform this action.' : status === 404 ? 'The requested resource was not found.' : status === 429 ? 'Too many requests. Please wait and try again.' : 'A network or server error occurred. Please try again.')
    return Promise.reject(new Error(typeof message === 'string' ? message : 'Unable to complete the request.'))
  },
)

export default axiosInstance
