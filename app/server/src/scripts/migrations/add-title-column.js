const mysql = require('mysql2');

const db = mysql.createConnection({
    host: '192.168.8.13',
    user: 'alulasftp',
    password: 'OvZtuo0ULcUX4aHW',
    database: 'filemanager'
});

db.connect((err) => {
    if (err) {
        console.error('Connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to database');

    // Check if column exists
    db.query(`SHOW COLUMNS FROM shares LIKE 'title'`, (err, results) => {
        if (err) {
            console.error('Error checking column:', err.message);
            db.end();
            process.exit(1);
        }

        if (results.length > 0) {
            console.log('Column "title" already exists');
            db.end();
            process.exit(0);
        }

        // Add column
        console.log('Adding column "title"...');
        db.query('ALTER TABLE shares ADD COLUMN title VARCHAR(255) AFTER fileName', (err) => {
            if (err) {
                console.error('Error adding column:', err.message);
                db.end();
                process.exit(1);
            }
            console.log('✅ Column "title" added successfully!');
            db.end();
            process.exit(0);
        });
    });
});
