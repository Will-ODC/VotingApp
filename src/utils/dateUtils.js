/**
 * Date utility functions for PST timezone handling
 * Provides consistent date formatting and timezone conversion for the voting application
 */

const PST_TIMEZONE = 'America/Los_Angeles';

/**
 * Formats a date to PST date string (YYYY-MM-DD format)
 * @param {Date|string} date - Date object or date string to format
 * @returns {string} Formatted date string in PST (YYYY-MM-DD)
 */
function formatDateToPST(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date provided to formatDateToPST');
    }
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: PST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    return formatter.format(dateObj);
}

/**
 * Formats a date to PST date and time string (YYYY-MM-DD HH:MM:SS format)
 * @param {Date|string} date - Date object or date string to format
 * @returns {string} Formatted date and time string in PST
 */
function formatDateTimeToPST(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date provided to formatDateTimeToPST');
    }
    
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: PST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: PST_TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const datePart = dateFormatter.format(dateObj);
    const timePart = timeFormatter.format(dateObj);
    
    return `${datePart} ${timePart}`;
}

/**
 * Sets a date to 11:59:59 PM PST (end of day in PST)
 * @param {Date|string} date - Date object or date string
 * @returns {Date} New Date object set to 11:59:59 PM PST
 */
function setTimeToPSTEndOfDay(date) {
    const dateObj = date instanceof Date ? new Date(date) : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date provided to setTimeToPSTEndOfDay');
    }
    
    // Get the date parts in PST
    const pstDateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: PST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(dateObj);
    
    const year = pstDateParts.find(part => part.type === 'year').value;
    const month = pstDateParts.find(part => part.type === 'month').value;
    const day = pstDateParts.find(part => part.type === 'day').value;
    
    // Create a new date at 11:59:59 PM PST
    // We need to work with UTC and adjust for PST offset
    const pstEndOfDay = new Date(`${year}-${month}-${day}T23:59:59`);
    
    // Get PST offset for this date
    const tempDate = new Date(pstEndOfDay.getTime());
    const utcTime = tempDate.getTime() + (tempDate.getTimezoneOffset() * 60000);
    
    // Calculate PST offset (PST is UTC-8, PDT is UTC-7)
    const pstTestDate = new Date(utcTime + (-8 * 3600000)); // Assume PST first
    const actualPSTTime = new Intl.DateTimeFormat('en-US', {
        timeZone: PST_TIMEZONE,
        hour12: false,
        hour: '2-digit'
    }).format(pstTestDate);
    
    // If it's daylight saving time, adjust by 1 hour
    const isDST = actualPSTTime !== '23';
    const pstOffset = isDST ? -7 : -8;
    
    const finalDate = new Date(utcTime + (pstOffset * 3600000));
    
    return finalDate;
}

/**
 * Converts a date string to end of day PST and returns ISO string
 * @param {string} dateString - Date string to convert (YYYY-MM-DD format)
 * @returns {string} ISO string representing end of day in PST
 */
function convertToPSTEndOfDay(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        throw new Error('Invalid date string provided to convertToPSTEndOfDay');
    }
    
    // Parse the date string and create a date object
    const dateParts = dateString.split('-');
    if (dateParts.length !== 3) {
        throw new Error('Date string must be in YYYY-MM-DD format');
    }
    
    // Simple approach: Use the fact that PST is typically UTC-8 or UTC-7 (DST)
    // Create a date string that represents 11:59:59 PM PST/PDT
    
    // First, let's determine if we're in DST for the target date
    const [year, month, day] = dateParts.map(Number);
    const testDate = new Date(year, month - 1, day);
    
    // PST: UTC-8 (November - March)
    // PDT: UTC-7 (April - October, roughly)
    // More precisely, check if we're in daylight saving time
    const isDST = (month >= 3 && month <= 10) && !(month === 3 && day < 8) && !(month === 11 && day >= 1);
    
    // Create the date string with proper timezone offset
    const offsetHours = isDST ? 7 : 8; // PDT: UTC-7, PST: UTC-8
    const offsetString = isDST ? '-07:00' : '-08:00';
    
    // Create the ISO string representing 11:59:59 PM PST/PDT
    const pstEndOfDay = `${dateString}T23:59:59.000${offsetString}`;
    
    // Convert to Date object (which will convert to UTC) and return ISO string
    const utcDate = new Date(pstEndOfDay);
    
    return utcDate.toISOString();
}

/**
 * Gets the current date and time in PST
 * @returns {Date} Current date and time adjusted to PST
 */
function getCurrentPSTDate() {
    return new Date();
}

/**
 * Checks if a date is in the past relative to PST timezone
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if the date is in the past (PST)
 */
function isDateInPastPST(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date provided to isDateInPastPST');
    }
    
    const now = new Date();
    return dateObj < now;
}

/**
 * Gets a human-readable relative time string in PST
 * @param {Date|string} date - Date to format
 * @returns {string} Human-readable relative time (e.g., "2 hours ago", "in 3 days")
 */
function getRelativeTimePST(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date provided to getRelativeTimePST');
    }
    
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (Math.abs(diffDay) >= 1) {
        const days = Math.abs(diffDay);
        return diffDay > 0 
            ? `in ${days} day${days !== 1 ? 's' : ''}`
            : `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffHour) >= 1) {
        const hours = Math.abs(diffHour);
        return diffHour > 0 
            ? `in ${hours} hour${hours !== 1 ? 's' : ''}`
            : `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffMin) >= 1) {
        const minutes = Math.abs(diffMin);
        return diffMin > 0 
            ? `in ${minutes} minute${minutes !== 1 ? 's' : ''}`
            : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
        return 'just now';
    }
}

module.exports = {
    formatDateToPST,
    formatDateTimeToPST,
    setTimeToPSTEndOfDay,
    convertToPSTEndOfDay,
    getCurrentPSTDate,
    isDateInPastPST,
    getRelativeTimePST,
    PST_TIMEZONE
};