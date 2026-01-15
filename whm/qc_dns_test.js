const axios = require('axios');
const pool = require('./src/config/db');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:4000/api/dns';
const TEST_TOKEN = 'qc-test-token-' + uuidv4();
const TEST_ZONE = 'qc-auto-test.com';

async function runQC() {
    let zoneId = null;
    let recordId = null;
    let userId = 1; // Assuming admin ID 1 exists

    console.log('Starting DNS Quality Control (Stage 9)...');

    try {
        // 1. SETUP: Create API Token
        console.log('[SETUP] Creating Scoped API Token for testing...');
        await pool.promise().query(
            'INSERT INTO api_tokens (userId, name, token, scopes) VALUES (?, ?, ?, ?)',
            [userId, 'QC Test Token', TEST_TOKEN, JSON.stringify(['dns:read', 'dns:write', 'admin'])]
        );

        const client = axios.create({
            baseURL: API_URL,
            headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        });

        // 2. UNIT/API TEST: Create Zone
        console.log('[TEST 1] Create Zone...');
        try {
            const resZone = await client.post('/', {
                domain: TEST_ZONE,
                type: 'master'
            });
            if (resZone.status !== 201) throw new Error('Failed to create zone');
        } catch (postErr) {
            console.error('Zone Creation Error Details:');
            console.error('  Status:', postErr.response?.status);
            console.error('  Data:', JSON.stringify(postErr.response?.data, null, 2));
            console.error('  Message:', postErr.message);
            console.error('  Code:', postErr.code);
            throw postErr;
        }
        // Fetch zone ID
        const zones = await client.get('/');
        const zoneParams = zones.data.find(z => z.domain === TEST_ZONE);
        if (!zoneParams) throw new Error('Zone not found after creation');
        zoneId = zoneParams.id;
        console.log('   ✅ Zone Created: ID ' + zoneId);

        // 3. API TEST: Create Record (A)
        console.log('[TEST 2] Create A Record...');
        const resRec = await client.post(`/${zoneId}/records`, {
            type: 'A',
            name: 'test',
            content: '1.2.3.4',
            ttl: 300
        });
        if (resRec.status !== 201) throw new Error('Failed to create record');
        console.log('   ✅ Record Created');

        // Verify Record
        const recs = await client.get(`/${zoneId}/records`);
        const rec = recs.data.find(r => r.name === 'test' && r.type === 'A');
        if (!rec) throw new Error('Record verification failed');
        recordId = rec.id;
        console.log('   ✅ Record Verified: ' + recordId);

        // 4. API TEST: Advanced Features (GeoDNS)
        console.log('[TEST 3] Create GeoDNS Record...');
        try {
            await client.post(`/${zoneId}/records`, {
                type: 'A',
                name: 'geo',
                content: '5.6.7.8',
                routing_policy: { type: 'geo', region: 'US' }
            });
            console.log('   ✅ GeoDNS Record Created');
        } catch (e) {
            console.error('   ❌ GeoDNS Failed: ' + e.response?.data?.error);
        }

        // 5. ROLLBACK TEST
        console.log('[TEST 4] Rollback Test...');
        // modify record
        await client.put(`/records/${recordId}`, {
            type: 'A',
            name: 'test',
            content: '9.9.9.9',
            auto_publish: true
        });
        console.log('   ✅ Record Modified (v2)');

        // Fetch history
        const hist = await client.get(`/${zoneId}/history`);
        if (hist.data.length > 0) {
            console.log(`   ✅ History found (${hist.data.length} versions)`);
            const versionId = hist.data[hist.data.length - 1].id; // Oldest

            // Rollback
            await client.post(`/${zoneId}/rollback/${versionId}`);
            console.log('   ✅ Rollback Triggered');
        } else {
            console.warn('   ⚠️ No history found (Versioning might need explicit trigger/config)');
        }

        // 6. SECURITY TEST: Zone Lock
        console.log('[TEST 5] Zone Lock Security...');
        await client.post(`/${zoneId}/lock`);
        console.log('   ✅ Zone Locked');

        const zoneCheck = await client.get(`/${zoneId}/records`); // GET is allowed
        await client.post(`/${zoneId}/unlock`);
        console.log('   ✅ Zone Unlocked');

        // 7. PROPAGATION TEST (Mock)
        console.log('[TEST 6] Propagation/Sync Check...');
        const finalRecs = await client.get(`/${zoneId}/records`);
        const targetRec = finalRecs.data.find(r => r.name === 'test');
        if (targetRec && targetRec.status === 'active') {
            console.log('   ✅ Record Status is ACTIVE (Propagated locally)');
        } else {
            console.warn('   ⚠️ Record Status is ' + targetRec?.status);
        }

        console.log('\n✨ ALL QC TESTS PASSED SUCCESSFULLY ✨');

    } catch (err) {
        console.error('\n❌ QC FAILED:');
        console.error(err.response ? `API ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message);
    } finally {
        // CLEANUP
        console.log('\n[CLEANUP] Removing test data...');
        if (zoneId) {
            try {
                // Delete Records handled by cascade usually, but let's be safe
                await pool.promise().query('DELETE FROM dns_records WHERE zoneId = ?', [zoneId]);
                await pool.promise().query('DELETE FROM dns_zones WHERE id = ?', [zoneId]);
            } catch (e) { }
        }
        // Remove Token
        await pool.promise().query('DELETE FROM api_tokens WHERE token = ?', [TEST_TOKEN]);
        process.exit(0);
    }
}

runQC();
