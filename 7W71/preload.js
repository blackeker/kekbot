const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    getStats: () => ipcRenderer.invoke('get-stats'),
    
    // Tekil ayar güncelleme
    updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
    
    // Liste güncellemeleri
    updateCommands: (commands) => ipcRenderer.invoke('update-commands', commands),
    updateGems: (gems) => ipcRenderer.invoke('update-gems', gems),
    
    // Dışa/İçe aktarma
    exportSettings: () => ipcRenderer.invoke('export-settings'),
    importSettings: () => ipcRenderer.invoke('import-settings'),
    
    // Bot kontrolü ve diğer işlemler
    toggleBot: () => ipcRenderer.invoke('toggle-bot'),
    openLogFile: () => ipcRenderer.invoke('open-log-file'),
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
    sendPotato: () => ipcRenderer.invoke('send-potato'),
    sendPotatoFromAccount: (token) => ipcRenderer.invoke('send-potato-from-account', token),
    checkTokens: () => ipcRenderer.invoke('check-tokens'),
    getTokenData: () => ipcRenderer.invoke('get-token-data'),

    // Token Yönetimi
    getTokens: () => ipcRenderer.invoke('get-tokens'),
    saveTokens: (tokens) => ipcRenderer.invoke('save-tokens', tokens),
    resetPotatoLog: () => ipcRenderer.invoke('reset-potato-log'),
    hideWindow: () => ipcRenderer.invoke('hide-window'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    getBasename: (filePath) => ipcRenderer.invoke('get-basename', filePath),
    toggleCommandSending: () => ipcRenderer.invoke('toggle-command-sending'),
    updateRPCSettings: (settings) => ipcRenderer.invoke('update-rpc-settings', settings),
    getRPCSettings: () => ipcRenderer.invoke('get-rpc-settings'),
    getRandomBots: () => ipcRenderer.invoke('get-random-bots'),
    resumeBotCommands: (token) => ipcRenderer.invoke('resume-bot-commands', token),
    sendCaptchaSolution: (token, solution, channelId) => ipcRenderer.invoke('send-captcha-solution', token, solution, channelId),
    // Send arbitrary message with specific token to a channel
    sendChannelMessage: (token, channelId, message) => ipcRenderer.invoke('send-channel-message', token, channelId, message),
    updateRandomBots: (configs) => ipcRenderer.invoke('update-random-bots', configs),
    toggleRandomBots: () => ipcRenderer.invoke('toggle-random-bots'),
    openDevTools: () => ipcRenderer.invoke('open-devtools'),
    // Ana süreçten gelen olayları dinleme
    onLog: (callback) => ipcRenderer.on('log', callback),
    onStatus: (callback) => ipcRenderer.on('status', callback),
    onRandomBotsStatus: (callback) => ipcRenderer.on('random-bots-status', callback),
    onStatsUpdated: (callback) => ipcRenderer.on('stats-updated', callback),
    onCommandSent: (callback) => ipcRenderer.on('command-sent', callback),
    onCaptchaRequired: (callback) => ipcRenderer.on('captcha-required', callback),
    onCaptchaSolved: (callback) => ipcRenderer.on('captcha-solved', callback),
    onTokenCheckComplete: (callback) => ipcRenderer.on('token-check-complete', callback),
    onFocusOnCaptcha: (callback) => ipcRenderer.on('focus-on-captcha', callback)
});
