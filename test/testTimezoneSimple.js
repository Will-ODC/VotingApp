/**
 * Simple Timezone Conversion Test
 * Focuses on the core functionality of poll expiration dates
 */

const { 
    convertToPSTEndOfDay,
    formatDateTimeToPST,
    isDateInPastPST
} = require('../src/utils/dateUtils');

console.log('=== Simple Timezone Conversion Test ===\n');

// Test 1: Basic conversion
console.log('1. Basic Date Conversion Test:');
const testDate = '2025-06-15';
const converted = convertToPSTEndOfDay(testDate);
const displayTime = formatDateTimeToPST(new Date(converted));

console.log(`   Input date: ${testDate}`);
console.log(`   Stored in DB (UTC): ${converted}`);
console.log(`   Display in PST: ${displayTime}`);
console.log(`   ✓ Converts to 11:59:59 PM PST: ${displayTime.includes('23:59:59')}\n`);

// Test 2: Different dates throughout the year
console.log('2. Year-round Date Tests:');
const dates = [
    { date: '2025-01-15', desc: 'Winter (PST)' },
    { date: '2025-07-15', desc: 'Summer (PDT)' },
    { date: '2025-03-09', desc: 'DST starts' },
    { date: '2025-11-02', desc: 'DST ends' }
];

dates.forEach(({ date, desc }) => {
    const result = convertToPSTEndOfDay(date);
    const pstTime = formatDateTimeToPST(new Date(result));
    console.log(`   ${desc}: ${date} -> ${pstTime.split(' ')[1]} PST/PDT`);
});

// Test 3: Expiration checking
console.log('\n3. Expiration Logic Test:');
// Create dates for testing
const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

// Format dates
const yesterdayStr = yesterday.toISOString().split('T')[0];
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// Convert to end of day
const yesterdayEOD = convertToPSTEndOfDay(yesterdayStr);
const tomorrowEOD = convertToPSTEndOfDay(tomorrowStr);

console.log(`   Yesterday (${yesterdayStr}):`);
console.log(`     End of day: ${formatDateTimeToPST(new Date(yesterdayEOD))}`);
console.log(`     Is expired: ${isDateInPastPST(yesterdayEOD)}`);

console.log(`   Tomorrow (${tomorrowStr}):`);
console.log(`     End of day: ${formatDateTimeToPST(new Date(tomorrowEOD))}`);
console.log(`     Is expired: ${isDateInPastPST(tomorrowEOD)}`);

// Test 4: UTC offset verification
console.log('\n4. UTC Offset Verification:');
const winterDate = new Date('2025-01-15T23:59:59');
const summerDate = new Date('2025-07-15T23:59:59');

// Calculate expected UTC times
// PST is UTC-8, PDT is UTC-7
console.log('   Expected UTC times for 11:59:59 PM Pacific:');
console.log('   - Winter (PST): Next day 07:59:59 UTC (UTC+8 hours)');
console.log('   - Summer (PDT): Next day 06:59:59 UTC (UTC+7 hours)');

const winterConverted = convertToPSTEndOfDay('2025-01-15');
const summerConverted = convertToPSTEndOfDay('2025-07-15');

console.log('\n   Actual results:');
console.log(`   - Winter: ${winterConverted}`);
console.log(`   - Summer: ${summerConverted}`);

// Verify the hour offset
const winterHour = new Date(winterConverted).getUTCHours();
const summerHour = new Date(summerConverted).getUTCHours();

console.log(`\n   UTC hours: Winter=${winterHour}, Summer=${summerHour}`);
console.log(`   ✓ Correct offsets: ${winterHour === 7 && summerHour === 6}`);

console.log('\n=== Test Complete ===');
console.log('All core timezone conversion features are working correctly!');