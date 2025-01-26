import { useMemo } from 'react'
import { ProcessedEvent } from '../types'
import useStore from './useStore'

const useEventPermissions = (event: ProcessedEvent) => {
  const { editable, deletable, draggable } = useStore()

  const canEdit = useMemo(() => {
    // Priority control to event specific editable value
    if (typeof event.editable !== 'undefined') {
      return event.editable
    }
    return editable
  }, [editable, event.editable])

  const canDelete = useMemo(() => {
    // Priority control to event specific deletable value
    if (typeof event.deletable !== 'undefined') {
      return event.deletable
    }
    return deletable
  }, [deletable, event.deletable])

  const canDrag = useMemo(() => {
    if (!canEdit) {
      return false
    }
    // Priority control to event specific draggable value
    if (typeof event.draggable !== 'undefined') {
      return event.draggable
    }
    return draggable
  }, [draggable, event.draggable, canEdit])

  return {
    canEdit,
    canDelete,
    canDrag,
  }
}

export default useEventPermissions
