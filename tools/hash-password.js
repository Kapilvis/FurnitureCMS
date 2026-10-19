'use strict';
/* Usage: node tools/hash-password.js "your long password"
   Prints a value for the ADMIN_PASSWORD_HASH environment variable, so the plain password never has to be stored on the host. */
const crypto = require('crypto');
const password = process.argv[2];
if (!password || password.length < 12) { console.error('Give a password of at least 12 characters as the first argument.'); process.exit(1); }
const salt = crypto.randomBytes(16).toString('hex');
console.log('ADMIN_PASSWORD_HASH=' + salt + ':' + crypto.scryptSync(password, salt, 64).toString('hex'));
