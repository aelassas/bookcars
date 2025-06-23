import { useContext } from 'react'
import { StoreContext } from '../store/context'

const useStore = () => useContext(StoreContext)

export default useStore
