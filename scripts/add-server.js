#!/usr/bin/env node
/**
 * Yumna Panel - Server Integration Helper
 * Script untuk menambahkan server remote ke Control Plane
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   🌐 Yumna Panel - Multi-Server Integration Tool     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Get WHM URL
        const whmUrl = await question('WHM URL (default: http://localhost:4000): ') || 'http://localhost:4000';

        // Step 2: Get Admin Token
        console.log('\n📝 Untuk mendapatkan Admin Token:');
        console.log('   1. Login ke Panel GUI');
        console.log('   2. Buka Developer Tools (F12)');
        console.log('   3. Cek localStorage.getItem("token")\n');
        const adminToken = await question('Admin Token: ');

        if (!adminToken) {
            console.error('❌ Admin Token diperlukan!');
            process.exit(1);
        }

        // Step 3: Get Server Details
        console.log('\n📋 Masukkan detail server yang akan ditambahkan:\n');

        const serverName = await question('Server Name (e.g., Production Server 1): ');
        const hostname = await question('Hostname (e.g., server1.example.com): ');
        const ip = await question('IP Address (e.g., 192.168.1.101): ');
        const isLocal = (await question('Is Local Server? (y/n, default: n): ')).toLowerCase() === 'y';

        let sshUser, sshPassword, sshPort;

        if (!isLocal) {
            sshUser = await question('SSH Username (default: root): ') || 'root';
            sshPassword = await question('SSH Password: ');
            sshPort = await question('SSH Port (default: 22): ') || '22';
        }

        // Step 4: Confirm
        console.log('\n📊 Server Details:');
        console.log('─────────────────────────────────────────');
        console.log(`Name:      ${serverName}`);
        console.log(`Hostname:  ${hostname}`);
        console.log(`IP:        ${ip}`);
        console.log(`Type:      ${isLocal ? 'Local' : 'Remote'}`);
        if (!isLocal) {
            console.log(`SSH User:  ${sshUser}`);
            console.log(`SSH Port:  ${sshPort}`);
        }
        console.log('─────────────────────────────────────────\n');

        const confirm = await question('Lanjutkan? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('❌ Dibatalkan.');
            process.exit(0);
        }

        // Step 5: Add Server
        console.log('\n⏳ Menambahkan server...');

        const payload = {
            name: serverName,
            hostname: hostname,
            ip: ip,
            is_local: isLocal
        };

        if (!isLocal) {
            payload.ssh_user = sshUser;
            payload.ssh_password = sshPassword;
            payload.ssh_port = parseInt(sshPort);
        }

        const response = await axios.post(`${whmUrl}/api/servers`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });

        console.log('✅ Server berhasil ditambahkan!');
        console.log(`   Server ID: ${response.data.id}`);

        // Step 6: Trigger Sync
        console.log('\n⏳ Melakukan sync awal...');

        await axios.post(`${whmUrl}/api/servers/${response.data.id}/sync`, {}, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        console.log('✅ Sync berhasil!');

        // Step 7: Show Next Steps
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║                  ✅ INTEGRASI BERHASIL!               ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('📌 Langkah Selanjutnya:');
        console.log('   1. Buka Panel GUI di browser');
        console.log('   2. Navigasi ke System → Server Management');
        console.log('   3. Anda akan melihat server baru dalam daftar');
        console.log('   4. Klik server untuk melihat metrics real-time\n');

        if (!isLocal) {
            console.log('⚠️  PENTING - Setup Agent di Server Remote:');
            console.log('   1. SSH ke server remote:');
            console.log(`      ssh ${sshUser}@${ip}`);
            console.log('   2. Install Yumna Agent:');
            console.log('      git clone https://github.com/ycopyer/yumna-panel.git /opt/yumna-panel');
            console.log('      cd /opt/yumna-panel/agent');
            console.log('      npm install');
            console.log('   3. Konfigurasi .env:');
            console.log('      PORT=4001');
            console.log(`      AGENT_SECRET=${process.env.AGENT_SECRET || 'your-secret-key'}`);
            console.log(`      WHM_URL=${whmUrl}`);
            console.log('   4. Jalankan Agent:');
            console.log('      npm start\n');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data?.error || error.message);

        if (error.response?.status === 401) {
            console.error('   → Admin Token tidak valid atau expired');
        } else if (error.response?.status === 500) {
            console.error('   → Server error, cek logs WHM');
        }
    } finally {
        rl.close();
    }
}

main();
