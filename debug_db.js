const Database = require('better-sqlite3');
const db = new Database('data/users.db', { readonly: true });

console.log("--- USERS ---");
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

console.log("\n--- COMMANDS ---");
const commands = db.prepare('SELECT * FROM commands').all();
console.log(commands);

console.log("\n--- SETTINGS (Specific) ---");
const settings = db.prepare('SELECT user_id, channel_id, theme FROM settings').all();
console.log(settings);
