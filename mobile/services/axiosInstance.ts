import axios from 'axios'
import * as AxiosHelper from '../common/AxiosHelper'
import * as env from '../config/env.config'

const axiosInstance = axios.create({ baseURL: env.API_HOST })

AxiosHelper.init(axiosInstance)

export default axiosInstance
