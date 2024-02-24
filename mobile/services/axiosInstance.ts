import axios from 'axios'
import * as AxiosHelper from '../common/AxiosHelper'
import * as Env from '../config/env.config'

const axiosInstance = axios.create({ baseURL: Env.API_HOST })

AxiosHelper.init(axiosInstance)

export default axiosInstance
