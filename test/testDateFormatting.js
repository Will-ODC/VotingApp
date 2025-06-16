/**
 * Test to understand the date formatting issue
 */

const { formatDateTimeToPST } = require('../src/utils/dateUtils');

console.log('=== DATE FORMATTING DEBUG ===\n');

// Create a test date
const testDateStr = '2025-07-16T06:59:59.000Z';
const testDate = new Date(testDateStr);

console.log('Test Date Analysis:');
console.log(`  ISO String: ${testDate.toISOString()}`);
console.log(`  toString(): ${testDate.toString()}`);
console.log(`  formatDateTimeToPST: ${formatDateTimeToPST(testDate)}`);

// Check what formatDateTimeToPST is actually doing
console.log('\nChecking formatDateTimeToPST internals:');

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

console.log(`  Date part: ${dateFormatter.format(testDate)}`);
console.log(`  Time part: ${timeFormatter.format(testDate)}`);

// Full format with timezone info
const fullFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
});

console.log(`  Full format: ${fullFormatter.format(testDate)}`);

// The issue was in the test - it was showing the wrong time
// Let's verify the actual conversion
const inputDate = '2025-07-15';
const { convertToPSTEndOfDay } = require('../src/utils/dateUtils');
const converted = convertToPSTEndOfDay(inputDate);
const convertedDate = new Date(converted);

console.log('\nActual Conversion Test:');
console.log(`  Input: ${inputDate}`);
console.log(`  Converted ISO: ${converted}`);
console.log(`  Formatted PST: ${formatDateTimeToPST(convertedDate)}`);

// Check if it's really 11:59:59 PM PST
const pstParts = fullFormatter.formatToParts(convertedDate);
const hour = pstParts.find(p => p.type === 'hour').value;
const minute = pstParts.find(p => p.type === 'minute').value;
const second = pstParts.find(p => p.type === 'second').value;

console.log(`  Time components: ${hour}:${minute}:${second}`);
console.log(`  ✅ Is 11:59:59 PM: ${hour === '23' && minute === '59' && second === '59'}`);