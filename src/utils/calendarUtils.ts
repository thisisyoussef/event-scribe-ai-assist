
import { Event, VolunteerRole } from "@/types/database";
import { getUserTimezone, getTimezoneAbbreviation } from "./timezoneUtils";

export const generateCalendarEvent = (event: Event, role: VolunteerRole) => {
  // Get user's timezone
  const userTimezone = getUserTimezone();
  const timezoneAbbr = getTimezoneAbbreviation();
  
  // Parse the event start datetime in user's local timezone
  const eventDate = new Date(event.start_datetime);
  
  // Create start and end times using the event date and role shift times
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
  
  // Format dates for calendar (YYYYMMDDTHHMMSSZ)
  const formatCalendarDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const title = encodeURIComponent(`${event.title} - ${role.role_label}`);
  const details = encodeURIComponent(
    `Role: ${role.role_label}\n` +
    `Shift: ${role.shift_start} - ${role.shift_end} (${timezoneAbbr})\n` +
    `Location: ${event.location}\n` +
    (event.description ? `Description: ${event.description}` : '')
  );
  const location = encodeURIComponent(event.location);
  
  const startTime = formatCalendarDate(startDate);
  const endTime = formatCalendarDate(endDate);
  
  // Google Calendar URL with timezone parameter
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}&ctz=${userTimezone}`;
  
  // Outlook Calendar URL
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&body=${details}&location=${location}`;
  
  // Generic calendar file content (ICS format)
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EasyEvent//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}-${role.id}@easyevent.com
DTSTART:${startTime}
DTEND:${endTime}
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

export const downloadICSFile = (icsContent: string, filename: string) => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
