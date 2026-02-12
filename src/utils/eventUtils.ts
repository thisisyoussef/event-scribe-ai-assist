import { Event } from "@/types/database";
import { toMichiganTime } from "./timezoneUtils";

// Check if an event is happening today (in Michigan timezone)
export const isEventToday = (event: Event): boolean => {
  const eventDate = toMichiganTime(event.start_datetime);
  const today = toMichiganTime(new Date());
  
  // Compare dates (ignoring time)
  return eventDate.toDateString() === today.toDateString();
};

// Check if an event is happening today or in the future
export const isEventTodayOrFuture = (event: Event): boolean => {
  const eventDate = toMichiganTime(event.start_datetime);
  const today = toMichiganTime(new Date());
  
  // Set today to start of day for accurate comparison
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  
  return eventDate >= todayStart;
};

// Get events happening today
export const getTodayEvents = (events: Event[]): Event[] => {
  return events.filter(event => isEventToday(event));
};

// Get upcoming events (today and future)
export const getUpcomingEvents = (events: Event[]): Event[] => {
  return events.filter(event => isEventTodayOrFuture(event));
};

// Check if there are any events happening today
export const hasEventsToday = (events: Event[]): boolean => {
  return getTodayEvents(events).length > 0;
};

// Check if there are any upcoming events
export const hasUpcomingEvents = (events: Event[]): boolean => {
  return getUpcomingEvents(events).length > 0;
};

// Create event slug for volunteer signup (reusing existing logic)
export const createEventSlug = (title: string, id: string): string => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  // Add last 4 characters of ID to handle duplicates
  const uniqueSuffix = id.slice(-4);
  return `${baseSlug}-${uniqueSuffix}`;
};
