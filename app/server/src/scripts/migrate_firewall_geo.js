const db = require('../config/db');

console.log('Migrating firewall table to include Geo Coordinates...');

const alterQuery = `
    ALTER TABLE firewall
    ADD COLUMN lat FLOAT NULL,
    ADD COLUMN lon FLOAT NULL;
`;

db.query(alterQuery, (err) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns lat/lon already exist. Skipping.');
        } else {
            console.error('Migration failed:', err.message);
            process.exit(1);
        }
    } else {
        console.log('Successfully added lat and lon columns to firewall table.');
    }
    process.exit(0);
});
