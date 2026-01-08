const db = require('./src/config/db');
const ComplianceService = require('./src/services/compliance');

/**
 * Diagnostic Tool: Verify Hash Chain Integrity
 * Usage: node server/verify_chain.js
 */

async function verifyHashChain() {
    console.log('🔍 Starting Hash Chain Integrity Verification...\n');

    try {
        const [logs] = await db.promise().query(
            'SELECT id, userId, action, description, ipAddress, ipLocal, event_id, hash, prev_hash, createdAt FROM activity_history ORDER BY id ASC'
        );

        if (logs.length === 0) {
            console.log('✅ No logs found. Chain is empty (valid state).');
            process.exit(0);
        }

        console.log(`📊 Total logs to verify: ${logs.length}\n`);

        let isValid = true;
        const issues = [];
        let verifiedCount = 0;

        for (let i = 0; i < logs.length; i++) {
            const currentLog = logs[i];
            const prevLog = i > 0 ? logs[i - 1] : null;

            // Check 1: prev_hash should match previous entry's hash
            if (prevLog) {
                if (currentLog.prev_hash !== prevLog.hash) {
                    isValid = false;
                    issues.push({
                        id: currentLog.id,
                        eventId: currentLog.event_id,
                        issue: 'Hash chain broken (prev_hash mismatch)',
                        expected: prevLog.hash,
                        actual: currentLog.prev_hash,
                        timestamp: currentLog.createdAt
                    });

                    console.log(`❌ BREACH DETECTED at Log #${currentLog.id}`);
                    console.log(`   Event ID: ${currentLog.event_id}`);
                    console.log(`   Expected prev_hash: ${prevLog.hash}`);
                    console.log(`   Actual prev_hash: ${currentLog.prev_hash}`);
                    console.log(`   Timestamp: ${currentLog.createdAt}\n`);
                }
            } else {
                // First entry should have null prev_hash
                if (currentLog.prev_hash !== null) {
                    isValid = false;
                    issues.push({
                        id: currentLog.id,
                        eventId: currentLog.event_id,
                        issue: 'First entry has non-null prev_hash',
                        actual: currentLog.prev_hash,
                        timestamp: currentLog.createdAt
                    });
                }
            }

            // Check 2: Verify hash calculation is correct
            const logData = {
                userId: currentLog.userId,
                action: currentLog.action,
                description: currentLog.description,
                ipAddress: currentLog.ipAddress,
                ipLocal: currentLog.ipLocal,
                timestamp: new Date(currentLog.createdAt).toISOString()
            };

            const calculatedHash = ComplianceService.calculateHash(logData, currentLog.prev_hash);

            if (calculatedHash !== currentLog.hash) {
                isValid = false;
                issues.push({
                    id: currentLog.id,
                    eventId: currentLog.event_id,
                    issue: 'Hash calculation mismatch (data tampering suspected)',
                    expected: calculatedHash,
                    actual: currentLog.hash,
                    timestamp: currentLog.createdAt
                });

                console.log(`❌ TAMPERING DETECTED at Log #${currentLog.id}`);
                console.log(`   Event ID: ${currentLog.event_id}`);
                console.log(`   Calculated hash: ${calculatedHash}`);
                console.log(`   Stored hash: ${currentLog.hash}`);
                console.log(`   Action: ${currentLog.action}`);
                console.log(`   Description: ${currentLog.description}\n`);
            }

            verifiedCount++;

            // Progress indicator
            if (verifiedCount % 100 === 0) {
                console.log(`   Verified ${verifiedCount}/${logs.length} entries...`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('VERIFICATION COMPLETE');
        console.log('='.repeat(60) + '\n');

        if (isValid) {
            console.log('✅ RESULT: CHAIN INTEGRITY VERIFIED');
            console.log(`   Total logs verified: ${verifiedCount}`);
            console.log(`   Status: All hashes valid`);
            console.log(`   Tampering detected: None\n`);
            console.log('🛡️  Your audit trail is cryptographically secure.');
        } else {
            console.log('🚨 RESULT: CHAIN INTEGRITY COMPROMISED');
            console.log(`   Total logs verified: ${verifiedCount}`);
            console.log(`   Issues found: ${issues.length}`);
            console.log(`   Status: CRITICAL SECURITY INCIDENT\n`);

            console.log('📋 DETAILED ISSUES:\n');
            issues.forEach((issue, idx) => {
                console.log(`${idx + 1}. Log #${issue.id} (${issue.eventId})`);
                console.log(`   Problem: ${issue.issue}`);
                console.log(`   Timestamp: ${issue.timestamp}`);
                if (issue.expected) {
                    console.log(`   Expected: ${issue.expected.substring(0, 16)}...`);
                    console.log(`   Actual: ${issue.actual.substring(0, 16)}...`);
                }
                console.log('');
            });

            console.log('⚠️  IMMEDIATE ACTIONS REQUIRED:');
            console.log('   1. Isolate the database (take snapshot)');
            console.log('   2. Notify security team and legal counsel');
            console.log('   3. Review INCIDENT_RESPONSE_HASH_BREACH.md');
            console.log('   4. Preserve evidence for forensic analysis');
            console.log('   5. DO NOT delete or modify any logs\n');
        }

        // Save report to file
        const reportPath = `./integrity_report_${Date.now()}.json`;
        const fs = require('fs');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            isValid,
            totalLogs: logs.length,
            verifiedCount,
            issues
        }, null, 2));

        console.log(`📄 Full report saved to: ${reportPath}\n`);

        process.exit(isValid ? 0 : 1);

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run verification
verifyHashChain();
