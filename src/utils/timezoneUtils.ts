
// Timezone utilities for handling Michigan Time (Eastern Time)
import { parseISO } from 'date-fns';
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Michigan is in Eastern Time Zone
export const MICHIGAN_TIMEZONE = 'America/Detroit';

// Convert a date to Michigan time
export const toMichiganTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, MICHIGAN_TIMEZONE);
};

// Convert from Michigan time to UTC for storage
export const fromMichiganTime = (date: Date): Date => {
  return fromZonedTime(date, MICHIGAN_TIMEZONE);
};

// Convert local datetime to UTC for storage (fixes the 4-hour offset issue)
export const localDateTimeToUTC = (dateString: string, timeString: string): string => {
  // Create a date object in the local timezone
  const localDate = new Date(`${dateString}T${timeString}:00`);
  // Convert to UTC for storage (this preserves the local time as UTC)
  return localDate.toISOString();
};

// Format a date in Michigan timezone
export const formatInMichiganTime = (
  date: Date | string, 
  formatString: string = 'yyyy-MM-dd HH:mm:ss zzz'
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString, { timeZone: MICHIGAN_TIMEZONE });
};

// Get current time in Michigan timezone
export const getMichiganTime = (): Date => {
  return toMichiganTime(new Date());
};

// Format time for display in Michigan timezone
export const formatTimeInMichigan = (dateTime: string): string => {
  return formatInMichiganTime(dateTime, 'h:mm a');
};

// Format date for display in Michigan timezone
export const formatDateInMichigan = (dateTime: string): string => {
  return formatInMichiganTime(dateTime, 'MMMM d, yyyy');
};

// Format date and time for display in Michigan timezone
export const formatDateTimeInMichigan = (dateTime: string): string => {
  return formatInMichiganTime(dateTime, 'MMMM d, yyyy \'at\' h:mm a zzz');
};

// Helper function to display time in Michigan timezone consistently
export const displayTimeInMichigan = (dateTime: string): string => {
  const date = new Date(dateTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: MICHIGAN_TIMEZONE
  });
};

// Convert 24-hour time format (HH:MM) to 12-hour AM/PM format
export const formatTime24To12 = (timeString: string): string => {
  if (!timeString || timeString === '--:--') return timeString;
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  
  if (isNaN(hour) || isNaN(minute)) return timeString;
  
  const date = new Date();
  date.setHours(hour, minute);
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
