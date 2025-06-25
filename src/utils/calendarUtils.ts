
import { Event, VolunteerRole } from "@/types/database";
import { formatInMichiganTime, toMichiganTime, MICHIGAN_TIMEZONE } from "./timezoneUtils";

export const generateCalendarEvent = (event: Event, role: VolunteerRole) => {
  // Convert event date to Michigan time first
  const eventDate = toMichiganTime(event.start_datetime);
  
  // Create start and end times using the event date and role shift times in Michigan timezone
  const [startHours, startMinutes] = role.shift_start.split(':').map(Number);
  const [endHours, endMinutes] = role.shift_end.split(':').map(Number);
  
  const startDate = new Date(eventDate);
  startDate.setHours(startHours, startMinutes, 0, 0);
  
  const endDate = new Date(eventDate);
  endDate.setHours(endHours, endMinutes, 0, 0);
  
  // Handle shifts that cross midnight
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  // Format dates for calendar (YYYYMMDDTHHMMSSZ) - convert to UTC for calendar standards
  const formatCalendarDate = (date: Date) => {
    // Convert Michigan time to UTC for calendar compatibility
    const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    // Apply Michigan timezone offset
    const michiganOffset = getMichiganTimezoneOffset(date);
    const adjustedDate = new Date(utcDate.getTime() + (michiganOffset * 60000));
    return adjustedDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const title = encodeURIComponent(`${event.title} - ${role.role_label}`);
  const details = encodeURIComponent(
    `Role: ${role.role_label}\n` +
    `Shift: ${role.shift_start} - ${role.shift_end} (Michigan Time)\n` +
    `Location: ${event.location}\n` +
    (event.description ? `Description: ${event.description}` : '')
  );
  const location = encodeURIComponent(event.location);
  
  const startTime = formatCalendarDate(startDate);
  const endTime = formatCalendarDate(endDate);
  
  // Google Calendar URL with timezone parameter
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}&ctz=${MICHIGAN_TIMEZONE}`;
  
  // Outlook Calendar URL with timezone
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&body=${details}&location=${location}`;
  
  // Generic calendar file content (ICS format) with timezone
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EasyEvent//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:${MICHIGAN_TIMEZONE}
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:${event.id}-${role.id}@easyevent.com
DTSTART;TZID=${MICHIGAN_TIMEZONE}:${startTime}
DTEND;TZID=${MICHIGAN_TIMEZONE}:${endTime}
SUMMARY:${decodeURIComponent(title)}
DESCRIPTION:${decodeURIComponent(details)}
LOCATION:${decodeURIComponent(location)}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}
END:VEVENT
END:VCALENDAR`;
  
  return {
    google: googleUrl,
    outlook: outlookUrl,
    ics: icsContent
  };
};

// Helper function to get Michigan timezone offset
const getMichiganTimezoneOffset = (date: Date): number => {
  // Create a date in Michigan timezone
  const michiganTime = new Date(date.toLocaleString("en-US", {timeZone: MICHIGAN_TIMEZONE}));
  const utcTime = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}));
  
  // Return offset in minutes
  return (utcTime.getTime() - michiganTime.getTime()) / (1000 * 60);
};

export const downloadICSFile = (icsContent: string, filename: string) => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
