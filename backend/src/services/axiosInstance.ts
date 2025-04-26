import axios from 'axios'
import env from '@/config/env.config'

// Ensure baseURL doesn't include 'undefined' in the path
const baseURL = env.API_HOST || 'http://localhost:3001'
const axiosInstance = axios.create({ baseURL })

export default axiosInstance
