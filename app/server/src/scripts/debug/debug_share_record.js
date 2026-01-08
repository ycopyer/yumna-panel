const db = require('./src/config/db');
db.query('SELECT * FROM shares WHERE id = ?', ['2fd31353-eae8-4f4b-a5da-70c7a92c0c31'], (err, results) => {
    if (err) console.error(err);
    else console.log(results[0]);
    process.exit();
});
