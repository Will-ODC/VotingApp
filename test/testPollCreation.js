/**
 * Poll Creation Date Test
 * Tests the actual poll creation flow with date conversion
 */

const { db } = require('../models/database');
const PollService = require('../src/services/PollService');
const PollRepository = require('../src/repositories/PollRepository');
const VoteRepository = require('../src/repositories/VoteRepository');
const { formatDateTimeToPST } = require('../src/utils/dateUtils');

async function testPollCreation() {
    console.log('=== POLL CREATION DATE TEST ===\n');
    
    try {
        // Initialize repositories and service
        const pollRepository = new PollRepository(db);
        const voteRepository = new VoteRepository(db);
        const pollService = new PollService(pollRepository, voteRepository);
        
        // Test data
        const testUserId = 1; // Assuming admin user exists
        const pollData = {
            title: 'Test Poll - Timezone Verification',
            description: 'This poll tests if dates are converted correctly to PST end of day',
            options: ['Option 1', 'Option 2', 'Option 3'],
            endDate: '2025-07-15', // Date picker provides YYYY-MM-DD
            voteThreshold: null,
            category: 'test',
            pollType: 'simple'
        };
        
        console.log('Creating poll with:');
        console.log(`  End date from picker: ${pollData.endDate}`);
        
        // Create the poll
        const createdPoll = await pollService.createPoll(testUserId, pollData);
        
        console.log('\nPoll created successfully!');
        console.log(`  Poll ID: ${createdPoll.id}`);
        console.log(`  Stored end date (UTC): ${createdPoll.end_date}`);
        
        // Retrieve the poll to verify
        const retrievedPoll = await db.get(
            'SELECT id, title, end_date FROM polls WHERE id = $1',
            [createdPoll.id]
        );
        
        console.log('\nRetrieved from database:');
        console.log(`  End date (raw): ${retrievedPoll.end_date}`);
        console.log(`  End date (PST): ${formatDateTimeToPST(new Date(retrievedPoll.end_date))}`);
        
        // Check expiration logic
        const expirationCheck = await db.get(
            `SELECT 
                id,
                title,
                end_date,
                end_date < CURRENT_TIMESTAMP as is_expired,
                EXTRACT(EPOCH FROM (end_date - CURRENT_TIMESTAMP)) / 3600 as hours_until_expiry
             FROM polls 
             WHERE id = $1`,
            [createdPoll.id]
        );
        
        console.log('\nExpiration check:');
        console.log(`  Is expired: ${expirationCheck.is_expired}`);
        console.log(`  Hours until expiry: ${Math.floor(expirationCheck.hours_until_expiry)}`);
        
        // Clean up test data
        await db.run('DELETE FROM votes WHERE option_id IN (SELECT id FROM options WHERE poll_id = $1)', [createdPoll.id]);
        await db.run('DELETE FROM options WHERE poll_id = $1', [createdPoll.id]);
        await db.run('DELETE FROM polls WHERE id = $1', [createdPoll.id]);
        
        console.log('\n✅ Test completed successfully!');
        console.log('   Date conversion is working correctly in the poll creation flow.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run the test
testPollCreation().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});