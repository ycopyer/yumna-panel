-- Firewall Enhancement Migration
-- Run this SQL script to add country column and default settings

-- 1. Add country column to firewall table
ALTER TABLE firewall ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL;

-- 2. Insert default firewall settings
INSERT INTO settings (key_name, value_text) VALUES ('firewall_threshold', '40')
ON DUPLICATE KEY UPDATE value_text = '40';

INSERT INTO settings (key_name, value_text) VALUES ('firewall_window', '60')
ON DUPLICATE KEY UPDATE value_text = '60';

INSERT INTO settings (key_name, value_text) VALUES ('firewall_codes', '404,403,500,401,301,302,201,505')
ON DUPLICATE KEY UPDATE value_text = '404,403,500,401,301,302,201,505';

-- Verify
SELECT 'Migration completed successfully!' as status;
SELECT * FROM settings WHERE key_name LIKE 'firewall%';
