import axios from 'axios'
import * as Env from '../config/env.config'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

/**
 * Get all suppliers.
 *
 * @returns {Promise<bookcarsTypes.User[]>}
 */
export const getAllSuppliers = (): Promise<bookcarsTypes.User[]> =>
  axios
    .get(
      `${Env.API_HOST}/api/all-suppliers`
    )
    .then((res) => res.data)
