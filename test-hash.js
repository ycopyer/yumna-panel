const argon2 = require('./whm/node_modules/argon2');

async function testDefaultHash() {
    const pass = 'admin123';
    const hashDefault = await argon2.hash(pass);
    const hashId = await argon2.hash(pass, { type: argon2.argon2id });

    console.log('Default Hash:', hashDefault);
    console.log('Argon2id Hash:', hashId);

    const verify1 = await argon2.verify(hashDefault, pass);
    const verify2 = await argon2.verify(hashId, pass);

    console.log('Verify Default:', verify1);
    console.log('Verify Id:', verify2);
}

testDefaultHash();
