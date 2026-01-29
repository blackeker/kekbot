const util = require('util');

const MAX_LOGS = 100;
const logBuffer = [];

// Orijinal konsol fonksiyonlarını sakla
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function captureLog(type, args) {
    const message = util.format(...args);
    const timestamp = new Date().toISOString();

    logBuffer.push({ timestamp, type, message });

    // Buffer taşarsa en eskiyi sil
    if (logBuffer.length > MAX_LOGS) {
        logBuffer.shift();
    }
}

// Hook Functions
function initLogger() {
    console.log = (...args) => {
        captureLog('INFO', args);
        originalLog.apply(console, args);
    };

    console.error = (...args) => {
        captureLog('ERROR', args);
        originalError.apply(console, args);
    };

    console.warn = (...args) => {
        captureLog('WARN', args);
        originalWarn.apply(console, args);
    };

    console.log('Logger initialized. Logs are now being captured.');
}

function getLogs(sinceTimestamp = null) {
    if (!sinceTimestamp) return logBuffer;
    return logBuffer.filter(log => log.timestamp > sinceTimestamp);
}

module.exports = {
    initLogger,
    getLogs,
    info: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args)
};
