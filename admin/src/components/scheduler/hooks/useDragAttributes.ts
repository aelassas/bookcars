import { DragEvent } from 'react'
import { useTheme } from '@mui/material'
import { ProcessedEvent } from '../types'
import useStore from './useStore'

const useDragAttributes = (event: ProcessedEvent) => {
  const { setCurrentDragged } = useStore()
  const theme = useTheme()
  return {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.stopPropagation()
      setCurrentDragged(event)
      e.currentTarget.style.backgroundColor = theme.palette.error.main
    },
    onDragEnd: (e: DragEvent<HTMLElement>) => {
      setCurrentDragged()
      e.currentTarget.style.backgroundColor = event.color || theme.palette.primary.main
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      e.stopPropagation()
      e.preventDefault()
    },
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      e.stopPropagation()
      e.preventDefault()
    },
  }
}

export default useDragAttributes
