// Timezone utilities for handling user's local timezone
import { parseISO, format } from 'date-fns';

// Get the user's browser timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Get timezone abbreviation (e.g., "EST", "PST")
export const getTimezoneAbbreviation = (): string => {
  const date = new Date();
  const timezoneName = date.toLocaleTimeString('en-US', { 
    timeZoneName: 'short' 
  }).split(' ').pop();
  return timezoneName || '';
};

// Convert a UTC date to user's local timezone
export const toLocalTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return new Date(dateObj);
};

// Convert from local datetime input to UTC for storage
export const localDateTimeToUTC = (dateString: string, timeString: string): string => {
  // Create a date object in the local timezone
  const localDate = new Date(`${dateString}T${timeString}:00`);
  // Convert to UTC for storage
  return localDate.toISOString();
};

// Format a date in user's local timezone
export const formatInLocalTime = (
  date: Date | string, 
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
};

// Get current time in user's local timezone
export const getLocalTime = (): Date => {
  return new Date();
};

// Format time for display in user's timezone (e.g., "6:00 PM")
export const formatTimeInLocal = (dateTime: string): string => {
  const date = new Date(dateTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Format date for display in user's timezone (e.g., "January 15, 2025")
export const formatDateInLocal = (dateTime: string): string => {
  const date = new Date(dateTime);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format date and time for display in user's timezone
export const formatDateTimeInLocal = (dateTime: string): string => {
  const date = new Date(dateTime);
  const dateStr = formatDateInLocal(dateTime);
  const timeStr = formatTimeInLocal(dateTime);
  const timezone = getTimezoneAbbreviation();
  return `${dateStr} at ${timeStr} ${timezone}`;
};

// Helper function to display time in user's timezone consistently
export const displayTimeInLocal = (dateTime: string): string => {
  const date = new Date(dateTime);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
