import { Breakpoint } from '@mui/material'
import { enUS } from 'date-fns/locale'
import { HourFormat, ResourceViewMode, SchedulerDirection, SchedulerProps } from '../types'
import { getOneView, getTimeZonedDate } from '../helpers/generals'

const defaultMonth = {
  weekDays: [0, 1, 2, 3, 4, 5, 6],
  weekStartOn: 6,
  startHour: 9,
  endHour: 17,
  navigation: true,
  disableGoToDay: false,
}

const defaultWeek = {
  weekDays: [0, 1, 2, 3, 4, 5, 6],
  weekStartOn: 6,
  startHour: 9,
  endHour: 17,
  step: 60,
  navigation: true,
  disableGoToDay: false,
}

const defaultDay = {
  startHour: 9,
  endHour: 17,
  step: 60,
  navigation: true,
}

const defaultResourceFields = {
  idField: 'assignee',
  textField: 'text',
  subTextField: 'subtext',
  avatarField: 'avatar',
  colorField: 'color',
}

const defaultTranslations = (trans: Partial<SchedulerProps['translations']> = {}) => {
  const { navigation, form, event, ...other } = trans

  return {
    navigation: {
      month: 'Month',
      week: 'Week',
      day: 'Day',
      agenda: 'Agenda',
      today: 'Today',
      ...navigation
    },
    form: {
      addTitle: 'Add Event',
      editTitle: 'Edit Event',
      confirm: 'Confirm',
      delete: 'Delete',
      cancel: 'Cancel',
      ...form
    },
    event: {
      title: 'Title',
      start: 'Start',
      end: 'End',
      allDay: 'All Day',
      ...event
    },
    ...({
      moreEvents: 'More...',
      loading: 'Loading...',
      noDataToDisplay: 'No data to display',
      ...other
    }),
  }
}

const defaultViews = (props: Partial<SchedulerProps>) => {
  const { month, week, day } = props
  return {
    month: month !== null ? Object.assign(defaultMonth, month) : null,
    week: week !== null ? Object.assign(defaultWeek, week) : null,
    day: day !== null ? Object.assign(defaultDay, day) : null,
  }
}

export const defaultProps = (props: Partial<SchedulerProps>) => {
  const {
    // month,
    // week,
    // day,
    translations,
    resourceFields,
    view,
    agenda,
    selectedDate,
    ...otherProps
  } = props
  const views = defaultViews(props)
  const defaultView = view || 'week'
  const initialView = views[defaultView] ? defaultView : getOneView(views)
  return {
    ...views,
    translations: defaultTranslations(translations),
    resourceFields: Object.assign(defaultResourceFields, resourceFields),
    view: initialView,
    selectedDate: getTimeZonedDate(selectedDate || new Date(), props.timeZone),
    ...({
      height: 600,
      navigation: true,
      disableViewNavigator: false,
      events: [],
      fields: [],
      loading: undefined,
      customEditor: undefined,
      onConfirm: undefined,
      onDelete: undefined,
      viewerExtraComponent: undefined,
      resources: [],
      resourceHeaderComponent: undefined,
      resourceViewMode: 'default' as ResourceViewMode,
      direction: 'ltr' as SchedulerDirection,
      dialogMaxWidth: 'md' as (false | Breakpoint | undefined),
      locale: enUS,
      deletable: true,
      editable: true,
      hourFormat: '12' as HourFormat,
      draggable: true,
      agenda,
      enableAgenda: typeof agenda === 'undefined' || agenda,
      ...otherProps
    }),
  }
}

export const initialStore = {
  ...defaultProps({}),
  setProps: () => { },
  dialog: false,
  selectedRange: undefined,
  selectedEvent: undefined,
  selectedResource: undefined,
  handleState: () => { },
  getViews: () => [],
  toggleAgenda: () => { },
  triggerDialog: () => { },
  triggerLoading: () => { },
  handleGotoDay: () => { },
  confirmEvent: () => { },
  setCurrentDragged: () => { },
  onDrop: () => { },
}
