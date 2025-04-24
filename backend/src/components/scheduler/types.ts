import { DialogProps, GridSize } from '@mui/material'
import { DateCalendarProps } from '@mui/x-date-pickers'
import { Locale } from 'date-fns'
import { DragEvent, ReactNode } from 'react'
import type { RRule } from 'rrule'
import { SelectOption } from './components/inputs/SelectInput'
import { View } from './components/nav/Navigation'
import { Store } from './store/types'
import { DayProps } from './views/Day'
import { StateItem } from './views/Editor'
import { MonthProps } from './views/Month'
import { WeekProps } from './views/Week'

export type DayHours =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export interface CellRenderedProps {
  day: Date;
  start: Date;
  end: Date;
  height: number;
  onClick(): void;
  onDragOver(e: DragEvent<HTMLButtonElement>): void;
  onDragEnter(e: DragEvent<HTMLButtonElement>): void;
  onDragLeave(e: DragEvent<HTMLButtonElement>): void;
  onDrop(e: DragEvent<HTMLButtonElement>): void;
}
interface CalendarEvent {
  event_id: number | string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  start: Date;
  end: Date;
  recurring?: RRule;
  disabled?: boolean;
  color?: string;
  textColor?: string;
  editable?: boolean;
  deletable?: boolean;
  draggable?: boolean;
  allDay?: boolean;
  /**
   * @default " "
   * passed as a children to mui <Avatar /> component
   */
  agendaAvatar?: React.ReactElement | string;
}
export interface Translations {
  navigation: Record<View, string> & { today: string; agenda: string };
  form: {
    addTitle: string;
    editTitle: string;
    confirm: string;
    delete: string;
    cancel: string;
  };
  event: Record<string, string> & {
    title: string;
    subtitle?: string;
    start: string;
    end: string;
    allDay: string;
  };
  validation?: {
    required?: string;
    invalidEmail?: string;
    onlyNumbers?: string;
    min?: string | ((min: number) => string);
    max?: string | ((max: number) => string);
  };
  moreEvents: string;
  noDataToDisplay: string;
  loading: string;
}

export type InputTypes = 'input' | 'date' | 'select' | 'hidden';

export type ProcessedEvent = CalendarEvent & Record<string, any>;

export interface EventRendererProps
  extends Pick<
    React.HTMLAttributes<HTMLElement>,
    'draggable' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onClick'
  > {
  event: ProcessedEvent;
}
export interface FieldInputProps {
  /** Available to all InputTypes */
  label?: string;
  /** Available to all InputTypes */
  placeholder?: string;
  /** Available to all InputTypes
   * @default false
   */
  required?: boolean;
  /** Available to all InputTypes
   * @default "outline"
   */
  variant?: 'standard' | 'filled' | 'outlined';
  /** Available to all InputTypes */
  disabled?: boolean;
  /** Available when @input="text" ONLY - Minimum length */
  min?: number;
  /** Available when @input="text" ONLY - Maximum length */
  max?: number;
  /** Available when @input="text" ONLY - Apply email Regex */
  email?: boolean;
  /** Available when @input="text" ONLY - Only numbers(int/float) allowed */
  decimal?: boolean;
  /** Available when @input="text" ONLY - Allow Multiline input. Use @rows property to set initial rows height */
  multiline?: boolean;
  /** Available when @input="text" ONLY - initial rows height */
  rows?: number;
  /** Available when @input="date" ONLY
   * @default "datetime"
   */
  type?: 'date' | 'datetime';
  /** Available when @input="select" ONLY - Multi-Select input style.
   * if you use "default" property with this, make sure your "default" property is an instance of Array
   */
  multiple?: 'chips' | 'default';
  /** Available when @input="select" ONLY - display loading spinner instead of expand arrow */
  loading?: boolean;
  /** Available when @input="select" ONLY - Custom error message */
  errMsg?: string;

  /* Used for Grid alignment in a single row md | sm | xs */
  md?: GridSize;
  /* Used for Grid alignment in a single row md | sm | xs */
  sm?: GridSize;
  /* Used for Grid alignment in a single row md | sm | xs */
  xs?: GridSize;
}
export interface FieldProps {
  name: string;
  type: InputTypes;
  /** Required for type="select" */
  options?: Array<SelectOption>;
  default?: string | number | Date | any;
  config?: FieldInputProps;
}

export type EventActions = 'create' | 'edit';
export type RemoteQuery = {
  start: Date;
  end: Date;
  view: 'day' | 'week' | 'month';
};
export type DefaultResource = {
  assignee?: string | number;
  text?: string;
  subtext?: string;
  avatar?: string;
  color?: string;
} & Record<string, any>;
export type ResourceFields = {
  idField: string;
  textField: string;
  subTextField?: string;
  avatarField?: string;
  colorField?: string;
} & Record<string, string>;

export interface SchedulerHelpers {
  state: Record<string, StateItem>;
  close(): void;
  loading(status: boolean): void;
  edited?: ProcessedEvent;
  onConfirm(event: ProcessedEvent | ProcessedEvent[], action: EventActions): void;
  [resourceKey: string]: unknown;
}

export type ResourceViewMode = 'default' | 'vertical' | 'tabs'

export type SchedulerDirection = 'rtl' | 'ltr'

export type HourFormat = '12' | '24'

export interface SchedulerProps {
  /** Min height of table
   * @default 600
   */
  height: number;
  /** Initial view to load */
  view: View;
  /** Activate Agenda view */
  agenda?: boolean;
  /** if true, day rows without event will be shown */
  alwaysShowAgendaDays?: boolean;
  /** Month view settings */
  month: MonthProps | null;
  /** Week view settings */
  week: WeekProps | null;
  /** Day view settings */
  day: DayProps | null;
  /** Initial date selected */
  selectedDate: Date;
  /** Show/Hide date navigation */
  navigation?: boolean;
  /** Show/Hide view navigator */
  disableViewNavigator?: boolean;
  /** */
  navigationPickerProps?: Partial<
    Omit<
      DateCalendarProps,
      'open' | 'onClose' | 'openTo' | 'views' | 'value' | 'readOnly' | 'onChange'
    >
  >;
  /** Events to display */
  events: ProcessedEvent[];
  /** Custom event render method */
  eventRenderer?: (props: EventRendererProps) => ReactNode | null;
  /** Async function to load remote data with current view data. */
  getRemoteEvents?(params: RemoteQuery): Promise<ProcessedEvent[] | void>;
  /** Custom additional fields with it's settings */
  fields: FieldProps[];
  /** Table loading state */
  loading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Async function triggered when add/edit event */
  onConfirm?(event: ProcessedEvent, action: EventActions): Promise<ProcessedEvent>;
  /** Async function triggered when delete event */
  onDelete?(deletedId: string | number): Promise<string | number | void>;
  /** Override editor modal */
  customEditor?(scheduler: SchedulerHelpers): ReactNode;
  /** Custom viewer/popper component. If used, `viewerExtraComponent` & `viewerTitleComponent` will be ignored */
  customViewer?(event: ProcessedEvent, close: () => void): ReactNode;
  /** Additional component in event viewer popper */
  viewerExtraComponent?:
  | ReactNode
  | ((fields: FieldProps[], event: ProcessedEvent) => ReactNode);
  /** Override viewer title component */
  viewerTitleComponent?(event: ProcessedEvent): ReactNode;
  /** Override viewer subtitle component */
  viewerSubtitleComponent?(event: ProcessedEvent): ReactNode;
  /** if true, the viewer popover will be disabled globally */
  disableViewer?: boolean;
  /** Resources array to split event views with resources */
  resources: DefaultResource[];
  /** Map resources fields */
  resourceFields: ResourceFields;
  /** Override header component of resource */
  resourceHeaderComponent?(resource: DefaultResource): ReactNode;
  /** Triggered when resource tabs changes */
  onResourceChange?(resource: DefaultResource): void;
  /** Resource header view mode
   * @default "default"
   */
  resourceViewMode: ResourceViewMode;
  /** Direction of table */
  direction: SchedulerDirection;
  /** Editor dialog maxWith
   * @default "md"
   */
  dialogMaxWidth: DialogProps['maxWidth'];
  /**
   * date-fns Locale object
   */
  locale: Locale;
  /**
   * Localization
   */
  translations: Translations;
  /**
   * Hour Format
   */
  hourFormat: HourFormat;
  /**
   * Time zone IANA ID: https://data.iana.org/time-zones/releases
   */
  timeZone?: string;
  /**
   * Triggered when event is dropped on time slot.
   */
  onEventDrop?(
    event: DragEvent<HTMLButtonElement>,
    droppedOn: Date,
    updatedEvent: ProcessedEvent,
    originalEvent: ProcessedEvent
  ): Promise<ProcessedEvent | void>;
  /**
   *
   */
  onEventClick?(event: ProcessedEvent): void;
  /**
   * Triggered when an event item is being edited from the popover
   */
  onEventEdit?(event: ProcessedEvent): void;
  /**
   * If event is deletable, applied to all events globally, overridden by event specific deletable prop
   * @default true
   */
  deletable?: boolean;
  /**
   * If calendar is editable, applied to all events/cells globally, overridden by event specific editable prop
   * @default true
   */
  editable?: boolean;
  /**
   * If event is draggable, applied to all events globally, overridden by event specific draggable prop
   * @default true
   */
  draggable?: boolean;
  /**
   * Triggered when the `selectedDate` prop changes by navigation date picker or `today` button.
   */
  onSelectedDateChange?(date: Date): void;
  /**
   * Triggered when navigation view changes.
   */
  onViewChange?(view: View, agenda?: boolean): void;
  /**
   * If true, the navigation controller bar will be sticky
   */
  stickyNavigation?: boolean;
  /**
   * Overrides the default behavior of more events button
   */
  onClickMore?(date: Date, gotToDay: (day: Date) => void): void;
  /**
   *
   */
  onCellClick?(start: Date, end: Date, resourceKey?: string, resourceVal?: string | number): void;
}

export interface SchedulerRef {
  el: HTMLDivElement;
  scheduler: Store;
}

// export interface Scheduler extends Partial<SchedulerProps> {}
