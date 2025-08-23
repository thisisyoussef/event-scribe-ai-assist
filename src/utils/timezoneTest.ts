// Test file to verify timezone conversion works correctly
import { localDateTimeToUTC, displayTimeInMichigan } from './timezoneUtils';

// Test the timezone conversion
export const testTimezoneConversion = () => {
  console.log('Testing timezone conversion...');
  
  // Test case: 6:00 PM on January 15, 2025
  const date = '2025-01-15';
  const time = '18:00'; // 6:00 PM
  
  const utcDateTime = localDateTimeToUTC(date, time);
  console.log(`Input: ${date} ${time}`);
  console.log(`UTC stored: ${utcDateTime}`);
  
  // Display in Michigan timezone
  const michiganTime = displayTimeInMichigan(utcDateTime);
  console.log(`Displayed in Michigan: ${michiganTime}`);
  
  // Should show 6:00 PM, not 2:00 PM
  return michiganTime === '6:00 PM';
};

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testTimezoneConversion = testTimezoneConversion;
} else {
  // Node environment
  console.log(testTimezoneConversion());
}
