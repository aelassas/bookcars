import { createContext } from 'react'

export type PositionManagerState = {
  renderedSlots: { [day: string]: { [resourceId: string]: { [eventId: string]: number } } };
};

type PositionManagerProps = {
  setRenderedSlot(day: string, eventId: string, position: number, resourceId?: string): void;
};

export const PositionContext = createContext<PositionManagerState & PositionManagerProps>({
  renderedSlots: {},
  setRenderedSlot: () => {},
})
