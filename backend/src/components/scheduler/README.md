# React Scheduler Component

This component was forked from the following [project]()https://github.com/aldabil21/react-scheduler and was updated to fix bugs and meet specific needs.

> :warning: **Notice**: This component uses `mui`/`emotion`/`date-fns`. if your project is not already using these libs, this component may not be suitable.

## Installation

If you plan to use `recurring` events in your scheduler, install `rrule` [package](https://www.npmjs.com/package/rrule)

## Usage

```jsx
import { Scheduler } from "@components/schduler/index";
```

## Example

```jsx
<Scheduler
  view="month"
  events={[
    {
      event_id: 1,
      title: "Event 1",
      start: new Date("2021/5/2 09:30"),
      end: new Date("2021/5/2 10:30"),
    },
    {
      event_id: 2,
      title: "Event 2",
      start: new Date("2021/5/4 10:00"),
      end: new Date("2021/5/4 11:00"),
    },
  ]}
/>
```

### Scheduler Props

All props are _optional_
| Prop | Value |
|----------|-------------|
| height | number. Min height of table. <br> _Default_: 600
| view | string. Initial view to load. options: "week", "month", "day". <br> _Default_: "week" (if it's not null)
| agenda | boolean. Activate agenda view
| alwaysShowAgendaDays | boolean. if true, day rows without events will be shown
| month | Object. Month view props. <br> _default_: <pre>{<br>weekDays: [0, 1, 2, 3, 4, 5], <br>weekStartOn: 6, <br>startHour: 9, <br>endHour: 17,<br>cellRenderer?:(props: CellProps) => JSX.Element,<br>navigation: true,<br>disableGoToDay: false<br>}</pre>
| week | Object. Week view props. <br> _default_: <pre>{ <br>weekDays: [0, 1, 2, 3, 4, 5], <br>weekStartOn: 6, <br>startHour: 9, <br>endHour: 17,<br>step: 60,<br>cellRenderer?:(props: CellProps) => JSX.Element,<br>navigation: true,<br>disableGoToDay: false<br>}</pre>
| day | Object. Day view props. <br> _default_: <pre>{<br>startHour: 9, <br>endHour: 17, <br>step: 60,<br>cellRenderer?:(props: CellProps) => JSX.Element,<br>hourRenderer?:(hour: string) => JSX.Element,<br>navigation: true<br>}</pre>
| selectedDate | Date. Initial selected date. <br>_Default_: `new Date()`
| navigation | boolean. Show/Hide top bar date navigation. <br>_Default_: `true`
| navigationPickerProps | CalendarPickerProps for top bar date navigation. Ref [CalendarPicker API](https://mui.com/x/api/date-pickers/calendar-picker/#main-content)
| disableViewNavigator | boolean. Show/Hide top bar date View navigator. <br>_Default_: `false`
| events | Array of ProcessedEvent. <br>_Default_: [] <br> <pre>type ProcessedEvent = {<br>event*id: number or string;<br>title: string;<br>subtitle?: string;<br>start: Date;<br>end: Date;<br>disabled?: boolean;<br>recurring: RRule;<br>color?: string or "palette.path";<br>textColor?: string or "palette.path";<br>editable?: boolean;<br>deletable?: boolean;<br>draggable?: boolean;<br>allDay?: boolean;<br>agendaAvatar?: React.ReactElement \| string<br>sx?: Mui sx prop<br>} </pre>
| eventRenderer | Function(event:ProcessedEvent): JSX.Element.<br> A function that overrides the event item render function, see demo \_Custom Event Renderer* below
| editable | boolean. If `true`, the scheduler cell click will not open the editor, and the event item will not show the edit button, this is applied to all events, and can be overridden in each event property, see `ProcessedEvent` type.
| deletable | boolean. Whether the event item will show the delete button, this is applied to all events, and can be overridden in each event property, see `ProcessedEvent` type.
| draggable | boolean. Whether activate drag&drop for the events, this is applied to all events, and can be overridden in each event property, see `ProcessedEvent` type.
| getRemoteEvents | Function(RemoteQuery). Return promise of array of events. Can be used as a callback to fetch events by parent component or fetch.<br><pre>type RemoteQuery = { <br> start: Date;<br> end: Date;<br> view: "day" \| "week" \| "month";<br>}</pre>
| fields | Array of extra fields with configurations. <br> Example: <pre> { <br> name: "description", <br> type: "input" , <br> config: { label: "Description", required: true, min: 3, email: true, variant: "outlined", ....<br>}</pre>
| loading | boolean. Loading state of the calendar table
| loadingComponent | Custom component to override the default `CircularProgress`
| onConfirm | Function(event, action). Return promise with the new added/edited event use with remote data. <br> _action_: `add` | `edit`
| onDelete | Function(id) Return promise with the deleted event id to use with remote data.
| customEditor | Function(scheduler). Override editor modal. <br> Provided prop _scheduler_ object with helper props: <br> <pre>{<br>state: state obj, <br>close(): void<br>loading(status: boolean): void<br>edited?: ProcessedEvent<br>onConfirm(event: ProcessedEvent, action:EventActions): void<br>}</pre>
| customViewer | Function(event: ProcessedEvent, close: () => void). Used to render fully customized content of the event popper. If used, `viewerExtraComponent` & `viewerTitleComponent` will be ignored
| viewerExtraComponent | Function(fields, event) OR Component. Additional component in event viewer popper
| viewerTitleComponent | Function(event). Helper function to render custom title in event popper
| viewerSubtitleComponent | Function(event). Helper function to render custom subtitle in event popper
| disableViewer | boolean. If true, the viewer popover will be disabled globally
| resources | Array. Resources array to split event views with resources <br>_Example_ <pre>{<br>assignee: 1,<br>text: "User One", <br>subtext: "Sales Manager", <br>avatar: "https://picsum.photos/200/300", <br>color: "#ab2d2d",<br> }</pre>
| resourceFields | Object. Map the resources correct fields. <br>_Example_:<pre>{<br>idField: "admin*id", <br>textField: "title", <br>subTextField: "mobile",<br>avatarField: "title", <br>colorField: "background",<br>}</pre>
| resourceHeaderComponent | Function(resource). Override header component of resource
| resourceViewMode | Display resources mode. <br>\_Options*: `default` | `vertical` | `tabs`
| onResourceChange | Function(resource: Resource): void. Triggered when the resource tabs changes, only applicable when `resourceViewMode="tabs"`
| direction | string. Table direction. `rtl` | `ltr`
| dialogMaxWidth | Edito dialog maxWith. Ex: `lg` | `md` | `sm`... _Default_:`md`
| locale | Locale of date-fns. _Default_: `enUS`
| hourFormat | Hour format. <br>_Options_: `12` | `24`. _Default_: `12`
| timeZone| String, time zone [IANA ID](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
| translations | Object. Translations view props. <br> _default_: <pre>{<br> navigation: {<br> month: "Month",<br> week: "Week",<br> day: "Day",<br> today: "Today"<br> agenda: "Agenda"<br> },<br> form: {<br> addTitle: "Add Event",<br> editTitle: "Edit Event",<br> confirm: "Confirm",<br> delete: "Delete",<br> cancel: "Cancel"<br> },<br> event: {<br> title: "Title",<br> subtitle: "Subtitle",<br> start: "Start",<br> end: "End",<br> allDay: "All Day"<br>},<br> validation: {<br> required: "Required",<br> invalidEmail: "Invalid Email",<br> onlyNumbers: "Only Numbers Allowed",<br> min: "Minimum {{min}} letters",<br> max: "Maximum {{max}} letters"<br> },<br> moreEvents: "More...",<br> noDataToDisplay: "No data to display",<br> loading: "Loading..."<br>}</pre>
| onEventDrop | Function(event: DragEvent<HTMLButtonElement>, droppedOn: Date, updatedEvent: ProcessedEvent, originalEvent: ProcessedEvent). Return a promise, used to update remote data of the dropped event. Return an event to update state internally, or void if event state is managed within component
| onEventClick | Function(event: ProcessedEvent): void. Triggered when an event item is clicked
| onEventEdit | Function(event: ProcessedEvent): void. Triggered when an event item is being edited from the popover
| onCellClick | Function(start: Date, end: Date, resourceKey?: string, resourceVal?: string | number): void. Triggered when a cell in the grid is clicked
| onSelectedDateChange | Function(date: Date): void. Triggered when the `selectedDate` prop changes by navigation date picker or `today` button
| onViewChange | Function(view: View, agenda?: boolean): void. Triggered when navigation view changes
| stickyNavigation | If `true`, the navigation controller bar will be sticky
| onClickMore | Function(date: Date, goToDay: Function(date: Date): void): void. Triggered when the "More..." button is clicked, it receives the date and a `goToDay` function that shows a day view for a specfic date.

### SchedulerRef

Used to help manage and control the internal state of the `Scheduler` component from outside of `Scheduler` props, Example:

```js
import { Scheduler } from "@aldabil/react-scheduler";
import type { SchedulerRef } from "@aldabil/react-scheduler/types"

const SomeComponent = () => {
  const calendarRef = useRef<SchedulerRef>(null);

  return <Fragment>
    <div>
      <Button onClick={()=>{
        calendarRef.current.scheduler.handleState("day", "view");
      }}>
        Change View
      </Button>
      <Button onClick={()=>{
        calendarRef.current.scheduler.triggerDialog(true, {
          start: /*Put the start date*/,
          end: /*Put the end date*/
        })
      }}>
        Add Event Tomorrow
      </Button>
    </div>

    <Scheduler
      ref={calendarRef}
      events={EVENTS}
      //...
    />
  </Fragment>
};
```

The `calendarRef` holds the entire internal state of the Scheduler component. Perhaps the most useful method inside the `calendarRef` is `handleState`, example:

```
calendarRef.current.scheduler.handleState(value, key);
```

consider looking inside `SchedulerRef` type to see all fields & methods available.

### Demos

- [Basic](https://codesandbox.io/p/sandbox/standard-x24pqk)
- [Remote Data](https://codesandbox.io/s/remote-data-j13ei)
- [Custom Fields](https://codesandbox.io/s/custom-fields-b2kbv)
- [Editor/Viewer Override](https://codesandbox.io/s/customeditor-tt2pf)
- [Resources/View Mode](https://codesandbox.io/s/resources-7wlcy)
- [Custom Cell Action](https://codesandbox.io/s/custom-cell-action-n02dv)
- [Custom Event Renderer](https://codesandbox.io/s/custom-event-renderer-rkf4xw)

### Todos

- [ ] Tests
- [x] Drag&Drop - partially
- [ ] Resizable
- [x] Recurring events - partially
- [x] Localization
- [x] Hour format 12 | 24
