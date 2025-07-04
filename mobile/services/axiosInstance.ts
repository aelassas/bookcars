import axios from 'axios'
import * as axiosHelper from '@/utils/axiosHelper'
import * as env from '@/config/env.config'

const axiosInstance = axios.create({ baseURL: env.API_HOST })

axiosHelper.init(axiosInstance)

export default axiosInstance
