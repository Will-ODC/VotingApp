// Quick script to show remaining Promise wrapper patterns that need fixing
const fs = require('fs');

const files = [
    'routes/polls.js'
];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n=== ${file} ===`);
    lines.forEach((line, index) => {
        if (line.includes('new Promise') && line.includes('db.')) {
            console.log(`Line ${index + 1}: ${line.trim()}`);
        }
    });
});