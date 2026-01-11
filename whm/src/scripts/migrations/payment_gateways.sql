-- Payment Gateway Configuration Table
CREATE TABLE IF NOT EXISTS payment_gateways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'stripe, paypal, etc',
    display_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    is_sandbox BOOLEAN DEFAULT TRUE,
    config JSON COMMENT 'API keys and configuration',
    supported_currencies JSON COMMENT 'Array of supported currency codes',
    webhook_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    user_id INT NOT NULL,
    gateway VARCHAR(50) NOT NULL COMMENT 'stripe, paypal, manual',
    gateway_transaction_id VARCHAR(255) COMMENT 'External transaction ID from gateway',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50) COMMENT 'card, paypal, bank_transfer, etc',
    metadata JSON COMMENT 'Additional payment details',
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_invoice (invoice_id),
    INDEX idx_user (user_id),
    INDEX idx_gateway (gateway),
    INDEX idx_status (status),
    INDEX idx_gateway_txn (gateway_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Refunds Table
CREATE TABLE IF NOT EXISTS payment_refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    gateway_refund_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    processed_by INT COMMENT 'Admin user ID who processed refund',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook Events Log
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gateway VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) COMMENT 'External event ID',
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gateway (gateway),
    INDEX idx_processed (processed),
    INDEX idx_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default gateway configurations
INSERT INTO payment_gateways (name, display_name, is_enabled, is_sandbox, config, supported_currencies) VALUES
('stripe', 'Stripe', FALSE, TRUE, 
 '{"publishable_key": "", "secret_key": "", "webhook_secret": ""}',
 '["USD", "EUR", "GBP", "IDR", "SGD", "MYR"]'
),
('paypal', 'PayPal', FALSE, TRUE,
 '{"client_id": "", "client_secret": "", "webhook_id": ""}',
 '["USD", "EUR", "GBP", "IDR", "SGD", "MYR"]'
),
('manual', 'Manual Payment', TRUE, FALSE,
 '{"bank_name": "", "account_number": "", "account_holder": "", "instructions": ""}',
 '["USD", "IDR"]'
);
