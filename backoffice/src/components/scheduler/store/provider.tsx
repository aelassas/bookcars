import React, { DragEvent, useEffect, useState } from 'react'
import { addMinutes, differenceInMinutes, isEqual } from 'date-fns'
import { EventActions, ProcessedEvent, SchedulerProps } from '../types'
import { defaultProps, initialStore } from './default'
import { StoreContext } from './context'
import { SchedulerState, SelectedRange, Store } from './types'
import { arraytizeFieldVal, getAvailableViews } from '../helpers/generals'
import { View } from '../components/nav/Navigation'

type Props = {
  children: React.ReactNode;
  initial: Partial<SchedulerProps>;
};

export const StoreProvider = ({ children, initial }: Props) => {
  const [state, set] = useState<Store>({ ...initialStore, ...defaultProps(initial) })

  useEffect(() => {
    set((prev) => ({
      ...prev,
      onEventDrop: initial.onEventDrop,
      customEditor: initial.customEditor,
      events: initial.events || [],
    }))
    // Rerender if changed on some props
  }, [initial.onEventDrop, initial.customEditor, initial.events])

  const handleState = (value: SchedulerState[keyof SchedulerState], name: keyof SchedulerState) => {
    set((prev) => ({ ...prev, [name]: value }))
  }

  const getViews = () => getAvailableViews(state)

  const toggleAgenda = () => {
    set((prev) => {
      const newStatus = !prev.agenda

      if (state.onViewChange && typeof state.onViewChange === 'function') {
        state.onViewChange(state.view, newStatus)
      }

      return { ...prev, agenda: newStatus }
    })
  }

  const triggerDialog = (status: boolean, selected?: SelectedRange | ProcessedEvent) => {
    const isEvent = selected as ProcessedEvent

    set((prev) => ({
      ...prev,
      dialog: status,
      selectedRange: isEvent?.event_id
        ? undefined
        : isEvent || {
            start: new Date(),
            end: new Date(Date.now() + 60 * 60 * 1000),
          },
      selectedEvent: isEvent?.event_id ? isEvent : undefined,
      selectedResource: prev.selectedResource || isEvent?.[state.resourceFields?.idField],
    }))
  }

  const triggerLoading = (status: boolean) => {
    // Trigger if not out-sourced by props
    if (typeof initial.loading === 'undefined') {
      set((prev) => ({ ...prev, loading: status }))
    }
  }

  const handleGotoDay = (day: Date) => {
    const currentViews = getViews()
    let view: View | undefined
    if (currentViews.includes('day')) {
      view = 'day'
      set((prev) => ({ ...prev, view: 'day', selectedDate: day }))
    } else if (currentViews.includes('week')) {
      view = 'week'
      set((prev) => ({ ...prev, view: 'week', selectedDate: day }))
    } else {
      console.warn('No Day/Week views available')
    }

    if (!!view && state.onViewChange && typeof state.onViewChange === 'function') {
      state.onViewChange(view, state.agenda)
    }

    if (!!view && state.onSelectedDateChange && typeof state.onSelectedDateChange === 'function') {
      state.onSelectedDateChange(day)
    }
  }

  const confirmEvent = (event: ProcessedEvent | ProcessedEvent[], action: EventActions) => {
    let updatedEvents: ProcessedEvent[]
    if (action === 'edit') {
      if (Array.isArray(event)) {
        updatedEvents = state.events.map((e) => {
          const exist = event.find((ex) => ex.event_id === e.event_id)
          return exist ? { ...e, ...exist } : e
        })
      } else {
        updatedEvents = state.events.map((e) =>
          (e.event_id === event.event_id ? { ...e, ...event } : e))
      }
    } else {
      updatedEvents = state.events.concat(event)
    }
    set((prev) => ({ ...prev, events: updatedEvents }))
  }

  const setCurrentDragged = (event?: ProcessedEvent) => {
    set((prev) => ({ ...prev, currentDragged: event }))
  }

  const onDrop = async (
    event: DragEvent<HTMLButtonElement>,
    eventId: string,
    startTime: Date,
    resKey?: string,
    resVal?: string | number
  ) => {
    // Get dropped event
    const droppedEvent = state.events.find((e) => {
      if (typeof e.event_id === 'number') {
        return e.event_id === +eventId
      }
      return e.event_id === eventId
    }) as ProcessedEvent

    // Check if has resource and if is multiple
    const resField = state.fields.find((f) => f.name === resKey)
    const isMultiple = !!resField?.config?.multiple
    let newResource = resVal as string | number | string[] | number[]
    if (resField) {
      const eResource = droppedEvent[resKey as string]
      const currentRes = arraytizeFieldVal(resField, eResource, droppedEvent).value
      if (isMultiple) {
        // if dropped on already owned resource
        if (currentRes.includes(resVal)) {
          // Omit if dropped on same time slot for multiple event
          if (isEqual(droppedEvent.start, startTime)) {
            return
          }
          newResource = currentRes
        } else {
          // if have multiple resource ? add other : move to other
          newResource = currentRes.length > 1 ? [...currentRes, resVal] : [resVal]
        }
      }
    }

    // Omit if dropped on same time slot for non multiple events
    if (isEqual(droppedEvent.start, startTime)) {
      if (!newResource || (!isMultiple && newResource === droppedEvent[resKey as string])) {
        return
      }
    }

    // Update event time according to original duration & update resources/owners
    const diff = differenceInMinutes(droppedEvent.end, droppedEvent.start)
    const updatedEvent: ProcessedEvent = {
      ...droppedEvent,
      start: startTime,
      end: addMinutes(startTime, diff),
      recurring: undefined,
      [resKey as string]: newResource || '',
    }

    // Local
    if (!state.onEventDrop || typeof state.onEventDrop !== 'function') {
      confirmEvent(updatedEvent, 'edit')
      return
    }
    // Remote
    try {
      triggerLoading(true)
      const _event = await state.onEventDrop(event, startTime, updatedEvent, droppedEvent)
      if (_event) {
        confirmEvent(_event, 'edit')
      }
    } finally {
      triggerLoading(false)
    }
  }

  const contextValue = React.useMemo(() => ({
    ...state,
    handleState,
    getViews,
    toggleAgenda,
    triggerDialog,
    triggerLoading,
    handleGotoDay,
    confirmEvent,
    setCurrentDragged,
    onDrop,
  }), [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  )
}
