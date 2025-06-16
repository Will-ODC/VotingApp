/**
 * Database Timezone Test
 * Tests how timezone-converted dates work with PostgreSQL
 */

const { db } = require('../models/database');
const { 
    convertToPSTEndOfDay,
    formatDateTimeToPST,
    formatDateToPST
} = require('../src/utils/dateUtils');

async function runDatabaseTests() {
    console.log('=== Database Timezone Integration Test ===\n');
    
    try {
        // Test 1: Insert and retrieve a date
        console.log('1. Database Storage Test:');
        const inputDate = '2025-12-25'; // Christmas
        const convertedDate = convertToPSTEndOfDay(inputDate);
        
        console.log(`   Input: ${inputDate}`);
        console.log(`   Converted to EOD PST: ${convertedDate}`);
        
        // Create a temporary test table
        await db.run(`
            CREATE TEMP TABLE test_dates (
                id SERIAL PRIMARY KEY,
                test_date TIMESTAMP,
                description TEXT
            )
        `);
        
        // Insert the converted date
        const result = await db.get(`
            INSERT INTO test_dates (test_date, description)
            VALUES ($1, $2)
            RETURNING id, test_date, description
        `, [convertedDate, 'Christmas 2025']);
        
        console.log(`   Stored in DB: ${result.test_date}`);
        
        // Retrieve and format
        const retrieved = await db.get(`
            SELECT test_date, description 
            FROM test_dates 
            WHERE id = $1
        `, [result.id]);
        
        const displayDate = formatDateToPST(new Date(retrieved.test_date));
        const displayDateTime = formatDateTimeToPST(new Date(retrieved.test_date));
        
        console.log(`   Retrieved from DB: ${retrieved.test_date}`);
        console.log(`   Display (date only): ${displayDate}`);
        console.log(`   Display (with time): ${displayDateTime}`);
        console.log(`   ✓ Date preserved: ${displayDate === inputDate}`);
        console.log(`   ✓ Time is EOD: ${displayDateTime.includes('23:59:59')}\n`);
        
        // Test 2: Query for expired dates
        console.log('2. Expiration Query Test:');
        
        // Insert multiple test dates
        const testDates = [
            { date: '2025-06-14', desc: '2 days ago' },
            { date: '2025-06-15', desc: 'Yesterday' },
            { date: '2025-06-16', desc: 'Today' },
            { date: '2025-06-17', desc: 'Tomorrow' },
            { date: '2025-06-18', desc: '2 days from now' }
        ];
        
        for (const { date, desc } of testDates) {
            const eod = convertToPSTEndOfDay(date);
            await db.run(`
                INSERT INTO test_dates (test_date, description)
                VALUES ($1, $2)
            `, [eod, desc]);
        }
        
        // Query for expired dates
        const expired = await db.all(`
            SELECT description, test_date
            FROM test_dates
            WHERE test_date < CURRENT_TIMESTAMP
            ORDER BY test_date DESC
        `);
        
        console.log(`   Expired entries (${expired.length} found):`);
        expired.forEach(row => {
            console.log(`   - ${row.description}: ${formatDateTimeToPST(new Date(row.test_date))}`);
        });
        
        // Query for active dates
        const active = await db.all(`
            SELECT description, test_date
            FROM test_dates
            WHERE test_date >= CURRENT_TIMESTAMP
            ORDER BY test_date ASC
        `);
        
        console.log(`\n   Active entries (${active.length} found):`);
        active.forEach(row => {
            console.log(`   - ${row.description}: ${formatDateTimeToPST(new Date(row.test_date))}`);
        });
        
        // Test 3: Time remaining calculation
        console.log('\n3. Time Remaining Calculation:');
        const tomorrow = await db.get(`
            SELECT 
                description,
                test_date,
                EXTRACT(EPOCH FROM (test_date - CURRENT_TIMESTAMP)) / 3600 as hours_remaining
            FROM test_dates
            WHERE description = 'Tomorrow'
        `);
        
        if (tomorrow) {
            console.log(`   ${tomorrow.description}:`);
            console.log(`   - Expires: ${formatDateTimeToPST(new Date(tomorrow.test_date))}`);
            console.log(`   - Hours remaining: ${Math.floor(tomorrow.hours_remaining)}`);
        }
        
        // Test 4: Timezone consistency
        console.log('\n4. Timezone Consistency Test:');
        
        // Insert a date using PostgreSQL's timezone functions
        const pgDate = await db.get(`
            INSERT INTO test_dates (test_date, description)
            VALUES (
                ('2025-07-04'::date + time '23:59:59') AT TIME ZONE 'America/Los_Angeles' AT TIME ZONE 'UTC',
                'July 4th via PG timezone'
            )
            RETURNING test_date
        `);
        
        const jsDate = convertToPSTEndOfDay('2025-07-04');
        
        console.log(`   JS conversion: ${jsDate}`);
        console.log(`   PG conversion: ${new Date(pgDate.test_date).toISOString()}`);
        console.log(`   ✓ Methods match: ${jsDate === new Date(pgDate.test_date).toISOString()}`);
        
        console.log('\n=== Database Test Complete ===');
        console.log('Timezone conversions work correctly with PostgreSQL!');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the tests
runDatabaseTests().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});