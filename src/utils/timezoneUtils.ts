
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
