import { useContext } from 'react'
import { PositionContext } from './context'

const usePosition = () => useContext(PositionContext)

export default usePosition
