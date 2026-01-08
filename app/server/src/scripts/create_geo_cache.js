const db = require('./src/config/db');

async function createGeoCache() {
    const query = `
        CREATE TABLE IF NOT EXISTS ip_geo_cache (
            ip VARCHAR(45) PRIMARY KEY,
            country VARCHAR(100),
            countryCode CHAR(2),
            region VARCHAR(100),
            regionName VARCHAR(100),
            city VARCHAR(100),
            zip VARCHAR(20),
            lat DECIMAL(10, 8),
            lon DECIMAL(11, 8),
            timezone VARCHAR(50),
            isp VARCHAR(255),
            org VARCHAR(255),
            as_info VARCHAR(255),
            last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;

    db.query(query, (err) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log('Table ip_geo_cache created or already exists');
        process.exit(0);
    });
}

createGeoCache();
