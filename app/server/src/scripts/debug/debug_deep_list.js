const { ensureSftp } = require('./src/services/storage');
const { listDirectory } = require('./sftp');

const run = async () => {
    try {
        const { sftp } = await ensureSftp(1);
        console.log("Listing level 1...");
        const list = await listDirectory(sftp, '/SERVER Web 8.13/testklaim');
        console.log("Level 1 found:", list.map(i => i.name));

        console.log("Listing level 2...");
        const list2 = await listDirectory(sftp, '/SERVER Web 8.13/testklaim/2');
        console.log("Level 2 success!");
        console.log(list2);
    } catch (e) {
        console.error("FAILED:", e.message);
    }
    process.exit();
};
run();
