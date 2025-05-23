
import { 
  dispatchEvent, 
  addEventListener, 
  removeEventListener, 
  EVENT_TYPES
} from './store';
import type { EventType, EventPayload } from './types';
import { useEventListener } from './hooks';

// Create a proper EventsService class to match the imports in other files
class EventsServiceClass {
  dispatchEvent(type: EventType, payload?: EventPayload) {
    return dispatchEvent(type, payload);
  }

  addEventListener(type: EventType, listener: (payload: EventPayload) => void) {
    return addEventListener(type, listener);
  }

  removeEventListener(type: EventType, listener: (payload: EventPayload) => void) {
    removeEventListener(type, listener);
  }

  useEventListener(type: EventType, callback: (payload: EventPayload) => void) {
    return useEventListener(type, callback);
  }

  listen(type: EventType, callback: (payload: EventPayload) => void) {
    // Return the unsubscribe function for easier cleanup
    return addEventListener(type, callback);
  }
}

// Create a singleton instance
export const EventsService = new EventsServiceClass();

// Re-export event types and constants
export { EVENT_TYPES };
export type { EventType, EventPayload };

export default EventsService;
