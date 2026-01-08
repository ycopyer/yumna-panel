const { ensureSftp } = require('./src/services/storage');
const { listDirectory } = require('./sftp');

const run = async () => {
    try {
        const { sftp } = await ensureSftp(1);
        const list = await listDirectory(sftp, '/SERVER Web 8.13/testklaim');
        console.log(JSON.stringify(list, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
};
run();
