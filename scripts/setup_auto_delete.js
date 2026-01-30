const { initializeDatabase, saveUserSettings, closeDatabase, getUserByApiKey } = require('../src/services/databaseService');
const Database = require('better-sqlite3');
const path = require('path');

// Manually initialize DB if specific path needed, but databaseService has default.
// initializeDatabase() uses default path which is relative to its location.

async function setup() {
    try {
        console.log('Initializing DB...');
        // databaseService uses relative path '../../data/users.db' from 'src/services'.
        // That resolves to 'data/users.db' from root. Correct.
        initializeDatabase();

        // Get user (we assume there's one or we get the first one)
        const dbPath = path.resolve(__dirname, '../data/users.db');
        const db = new Database(dbPath);
        const user = db.prepare('SELECT discord_user_id FROM users LIMIT 1').get();

        if (!user) {
            console.error('No user found!');
            return;
        }

        const userId = user.discord_user_id;
        console.log(`Configuring for user: ${userId}`);

        const config = {
            enabled: true,
            channelId: '1435279104046923858',
            colors: [
                15206953, // Red (#e80a29)
                4650544,  // Green (#46f630)
                3090729   // Dark (#2f2929)
            ]
        };

        await saveUserSettings(userId, { autoDeleteConfig: config });
        console.log('✅ Auto-delete configuration saved successfully!');
        console.log(config);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        closeDatabase();
    }
}

setup();
