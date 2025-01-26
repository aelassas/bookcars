import { createContext } from 'react'
import { initialStore } from './default'
import { Store } from './types'

export const StoreContext = createContext<Store>(initialStore)
