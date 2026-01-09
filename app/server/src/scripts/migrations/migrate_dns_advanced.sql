-- Add DNSSEC and Cloudflare support to dns_zones table
ALTER TABLE dns_zones 
ADD COLUMN IF NOT EXISTS dnssec_enabled TINYINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS dnssec_ds_record TEXT,
ADD COLUMN IF NOT EXISTS dnssec_dnskey TEXT,
ADD COLUMN IF NOT EXISTS cloudflare_zone_id VARCHAR(255);
