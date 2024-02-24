import axios from 'axios'
import Env from '../config/env.config'

const axiosInstance = axios.create({ baseURL: Env.API_HOST })

export default axiosInstance
