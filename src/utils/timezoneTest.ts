// Test file to verify timezone conversion works correctly
import { localDateTimeToUTC, displayTimeInLocal } from './timezoneUtils';

// Test the timezone conversion
export const testTimezoneConversion = () => {
  console.log('Testing timezone conversion...');
  
  // Test case: 6:00 PM on January 15, 2025
  const date = '2025-01-15';
  const time = '18:00'; // 6:00 PM
  
  const utcDateTime = localDateTimeToUTC(date, time);
  console.log(`Input: ${date} ${time}`);
  console.log(`UTC stored: ${utcDateTime}`);
  
  // Display in user's local timezone
  const localTime = displayTimeInLocal(utcDateTime);
  console.log(`Displayed in local timezone: ${localTime}`);
  
  // Should show 6:00 PM in user's timezone
  return localTime === '06:00 PM';
};

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testTimezoneConversion = testTimezoneConversion;
} else {
  // Node environment
  console.log(testTimezoneConversion());
}
