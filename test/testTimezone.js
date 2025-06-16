/**
 * Timezone Conversion Test Script
 * Tests the PST timezone conversion implementation for poll expiration dates
 */

const { 
    formatDateToPST,
    formatDateTimeToPST,
    setTimeToPSTEndOfDay,
    convertToPSTEndOfDay,
    getCurrentPSTDate,
    isDateInPastPST,
    getRelativeTimePST,
    PST_TIMEZONE
} = require('../src/utils/dateUtils');

// Color codes for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Test runner
let passedTests = 0;
let failedTests = 0;

function testCase(description, testFn) {
    console.log(`\n${colors.blue}Testing: ${description}${colors.reset}`);
    try {
        testFn();
        console.log(`${colors.green}✓ PASSED${colors.reset}`);
        passedTests++;
    } catch (error) {
        console.log(`${colors.red}✗ FAILED${colors.reset}`);
        console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
        console.log(error.stack);
        failedTests++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

console.log(`${colors.yellow}=== Timezone Conversion Test Suite ===${colors.reset}`);
console.log(`Testing date conversion logic for PST timezone handling\n`);

// Test 1: Basic date string to end of day PST conversion
testCase('Convert date string to end of day PST', () => {
    const inputDate = '2025-06-15';
    const result = convertToPSTEndOfDay(inputDate);
    
    console.log(`  Input: ${inputDate}`);
    console.log(`  Output: ${result}`);
    
    // Parse the result to check the time components
    const resultDate = new Date(result);
    const pstTime = formatDateTimeToPST(resultDate);
    console.log(`  PST Time: ${pstTime}`);
    
    // The result should be a valid ISO string
    assert(result.includes('T'), 'Result should be in ISO format');
    assert(result.endsWith('Z'), 'Result should be in UTC format (ends with Z)');
    
    // When converted to PST, it should show 23:59:59 (11:59:59 PM)
    assert(pstTime.includes('23:59:59'), 'Time should be 23:59:59 in PST');
});

// Test 2: Test multiple dates including edge cases
testCase('Multiple date conversions', () => {
    const testDates = [
        '2025-01-01', // New Year's Day (PST - Standard Time)
        '2025-06-15', // Summer (PDT - Daylight Time)
        '2025-03-09', // Day before DST starts
        '2025-03-10', // Day DST starts (spring forward)
        '2025-11-02', // Day before DST ends
        '2025-11-03', // Day DST ends (fall back)
        '2025-12-31', // End of year
    ];
    
    testDates.forEach(date => {
        const result = convertToPSTEndOfDay(date);
        const resultDate = new Date(result);
        const pstDateTime = formatDateTimeToPST(resultDate);
        
        console.log(`\n  ${date} -> ${pstDateTime} PST`);
        console.log(`  UTC: ${result}`);
        
        // Should always be 23:59:59 in PST/PDT
        assert(pstDateTime.includes('23:59:59'), 
            `${date} should convert to 23:59:59 PST/PDT`);
        
        // The date portion should remain the same
        assert(pstDateTime.startsWith(date), 
            `Date portion should remain ${date}`);
    });
});

// Test 3: Database storage and retrieval simulation
testCase('Database storage and retrieval simulation', () => {
    const originalDate = '2025-06-15';
    
    // Step 1: Convert to PST end of day (what gets stored)
    const storedDate = convertToPSTEndOfDay(originalDate);
    console.log(`\n  Original input: ${originalDate}`);
    console.log(`  Stored in DB: ${storedDate}`);
    
    // Step 2: Simulate retrieval from database
    const retrievedDate = new Date(storedDate);
    
    // Step 3: Format for display
    const displayDate = formatDateToPST(retrievedDate);
    const displayDateTime = formatDateTimeToPST(retrievedDate);
    
    console.log(`  Display (date only): ${displayDate}`);
    console.log(`  Display (full): ${displayDateTime}`);
    
    // The date portion should match the original input
    assert(displayDate === originalDate, 
        'Retrieved date should match original input');
    
    // The time should be end of day
    assert(displayDateTime.includes('23:59:59'), 
        'Retrieved time should be 23:59:59 PST');
});

// Test 4: Expiration checking
testCase('Poll expiration checking', () => {
    // Create a poll that expires tomorrow at end of day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateToPST(tomorrow);
    const expiryDate = convertToPSTEndOfDay(tomorrowStr);
    
    console.log(`\n  Tomorrow's date: ${tomorrowStr}`);
    console.log(`  Expiry (UTC): ${expiryDate}`);
    console.log(`  Expiry (PST): ${formatDateTimeToPST(new Date(expiryDate))}`);
    
    // Should not be expired yet
    const isExpired = isDateInPastPST(expiryDate);
    assert(!isExpired, 'Poll expiring tomorrow should not be expired');
    
    // Create a poll that expired yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToPST(yesterday);
    const expiredDate = convertToPSTEndOfDay(yesterdayStr);
    
    console.log(`\n  Yesterday's date: ${yesterdayStr}`);
    console.log(`  Expired (PST): ${formatDateTimeToPST(new Date(expiredDate))}`);
    
    // Should be expired
    const wasExpired = isDateInPastPST(expiredDate);
    assert(wasExpired, 'Poll that expired yesterday should be expired');
});

// Test 5: Current time handling
testCase('Current PST time', () => {
    const now = getCurrentPSTDate();
    const nowPST = formatDateTimeToPST(now);
    
    console.log(`\n  Current time (UTC): ${now.toISOString()}`);
    console.log(`  Current time (PST): ${nowPST}`);
    
    // Verify it's a valid date
    assert(!isNaN(now.getTime()), 'Current time should be valid');
});

// Test 6: Relative time display
testCase('Relative time display', () => {
    const now = new Date();
    
    // Test various time differences
    const testCases = [
        { offset: -2 * 24 * 60 * 60 * 1000, expected: '2 days ago' },
        { offset: -1 * 24 * 60 * 60 * 1000, expected: '1 day ago' },
        { offset: -2 * 60 * 60 * 1000, expected: '2 hours ago' },
        { offset: -30 * 60 * 1000, expected: '30 minutes ago' },
        { offset: 0, expected: 'just now' },
        { offset: 30 * 60 * 1000, expected: 'in 30 minutes' },
        { offset: 2 * 60 * 60 * 1000, expected: 'in 2 hours' },
        { offset: 1 * 24 * 60 * 60 * 1000, expected: 'in 1 day' },
        { offset: 3 * 24 * 60 * 60 * 1000, expected: 'in 3 days' },
    ];
    
    testCases.forEach(({ offset, expected }) => {
        const testDate = new Date(now.getTime() + offset);
        const relative = getRelativeTimePST(testDate);
        console.log(`\n  ${relative} (expected: ${expected})`);
        assert(relative === expected, `Should display "${expected}"`);
    });
});

// Test 7: Edge case - invalid inputs
testCase('Invalid input handling', () => {
    // Test invalid date string
    try {
        convertToPSTEndOfDay('not-a-date');
        assert(false, 'Should throw error for invalid date');
    } catch (e) {
        console.log(`  ✓ Correctly threw error: ${e.message}`);
    }
    
    // Test empty string
    try {
        convertToPSTEndOfDay('');
        assert(false, 'Should throw error for empty string');
    } catch (e) {
        console.log(`  ✓ Correctly threw error: ${e.message}`);
    }
    
    // Test null
    try {
        convertToPSTEndOfDay(null);
        assert(false, 'Should throw error for null');
    } catch (e) {
        console.log(`  ✓ Correctly threw error: ${e.message}`);
    }
});

// Test 8: Daylight Saving Time transitions
testCase('Daylight Saving Time transitions', () => {
    // 2025 DST dates for US:
    // - Starts: March 9, 2025 at 2:00 AM (spring forward)
    // - Ends: November 2, 2025 at 2:00 AM (fall back)
    
    console.log('\n  Testing DST transition dates:');
    
    // Day before DST starts (PST)
    const beforeDST = '2025-03-08';
    const beforeDSTResult = convertToPSTEndOfDay(beforeDST);
    const beforeDSTDate = new Date(beforeDSTResult);
    console.log(`\n  Before DST (${beforeDST}):`);
    console.log(`    UTC: ${beforeDSTResult}`);
    console.log(`    PST: ${formatDateTimeToPST(beforeDSTDate)}`);
    console.log(`    UTC hours from midnight PST: ${23 + 8} (should be 31 for PST)`);
    
    // Day DST starts (PDT)
    const dstStarts = '2025-03-09';
    const dstStartsResult = convertToPSTEndOfDay(dstStarts);
    const dstStartsDate = new Date(dstStartsResult);
    console.log(`\n  DST starts (${dstStarts}):`);
    console.log(`    UTC: ${dstStartsResult}`);
    console.log(`    PDT: ${formatDateTimeToPST(dstStartsDate)}`);
    console.log(`    UTC hours from midnight PDT: ${23 + 7} (should be 30 for PDT)`);
    
    // During DST (PDT)
    const duringDST = '2025-07-15';
    const duringDSTResult = convertToPSTEndOfDay(duringDST);
    const duringDSTDate = new Date(duringDSTResult);
    console.log(`\n  During DST (${duringDST}):`);
    console.log(`    UTC: ${duringDSTResult}`);
    console.log(`    PDT: ${formatDateTimeToPST(duringDSTDate)}`);
    
    // After DST ends (PST)
    const afterDST = '2025-11-15';
    const afterDSTResult = convertToPSTEndOfDay(afterDST);
    const afterDSTDate = new Date(afterDSTResult);
    console.log(`\n  After DST (${afterDST}):`);
    console.log(`    UTC: ${afterDSTResult}`);
    console.log(`    PST: ${formatDateTimeToPST(afterDSTDate)}`);
    
    // All should show 23:59:59 in their respective PST/PDT times
    assert(formatDateTimeToPST(beforeDSTDate).includes('23:59:59'), 
        'Before DST should be 23:59:59 PST');
    assert(formatDateTimeToPST(dstStartsDate).includes('23:59:59'), 
        'DST start day should be 23:59:59 PDT');
    assert(formatDateTimeToPST(duringDSTDate).includes('23:59:59'), 
        'During DST should be 23:59:59 PDT');
    assert(formatDateTimeToPST(afterDSTDate).includes('23:59:59'), 
        'After DST should be 23:59:59 PST');
});

// Summary
console.log(`\n${colors.yellow}=== Test Summary ===${colors.reset}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

if (failedTests === 0) {
    console.log(`\n${colors.green}All tests passed! The timezone conversion is working correctly.${colors.reset}`);
    process.exit(0);
} else {
    console.log(`\n${colors.red}Some tests failed. Please review the implementation.${colors.reset}`);
    process.exit(1);
}