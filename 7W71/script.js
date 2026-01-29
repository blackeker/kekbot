document.addEventListener('DOMContentLoaded', async () => {
    const api = window.api;

    // --- Sidebar Navigation ---
    // Re-initialize menu items and sections to include the new captcha tab
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.style.display = 'none');
            const sectionId = item.dataset.section;
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
            }

            if (sectionId === 'token-management') {
                renderAccountConfigs('config');
            }
            if (sectionId === 'rpc-settings-section') {
                renderSideBotRpcSettings();
            }
            if (sectionId === 'potato-sending-section') {
                renderAccountConfigs('potato');
            }
        });
    });



    document.getElementById('potato-account-list').addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('btn-send-potato')) {
            const token = target.dataset.token;
            addLog(`🥔 Patates gönderiliyor: ...${token.slice(-6)}`);
            const result = await api.sendPotatoFromAccount(token);
            if (result.success) {
                addLog(`✅ Patates gönderildi: ...${token.slice(-6)}`);
            } else {
                addLog(`❌ Patates gönderilemedi: ...${token.slice(-6)} - ${result.error}`);
            }
        }
    });

    // RPC Sekme Değiştirme
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const tabId = link.dataset.tab;
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // Ana bot RPC toggle
const mainRpcEnabledCheckbox = document.getElementById('main-rpc-enabled');
const mainRpcSettings = document.getElementById('main-rpc-settings');

if (mainRpcEnabledCheckbox) {
    mainRpcEnabledCheckbox.addEventListener('change', () => {
        mainRpcSettings.style.display = mainRpcEnabledCheckbox.checked ? 'block' : 'none';
    });
}

// Ana bot RPC buton ekleme
const btnAddMainRpcButton = document.getElementById('btn-add-main-rpc-button');
const mainRpcButtonsList = document.getElementById('main-rpc-buttons-list');

if (btnAddMainRpcButton) {
    btnAddMainRpcButton.addEventListener('click', () => {
        mainRpcButtonsList.appendChild(createRPCButtonRow());
    });
}

// Ana bot RPC kaydetme
const btnSaveMainRpc = document.getElementById('btn-save-main-rpc');
if (btnSaveMainRpc) {
    btnSaveMainRpc.addEventListener('click', async () => {
        const rpcButtons = [];
        const buttonRows = mainRpcButtonsList.querySelectorAll('.rpc-button-row');
        buttonRows.forEach(row => {
            const label = row.querySelector('.rpc-btn-label').value.trim();
            const url = row.querySelector('.rpc-btn-url').value.trim();
            if (label && url) {
                rpcButtons.push({ label, url });
            }
        });

        const rpcSettings = {
            enabled: mainRpcEnabledCheckbox.checked,
            settings: {
                applicationId: document.getElementById('main-rpc-app-id').value.trim(),
                name: document.getElementById('main-rpc-name').value.trim(),
                details: document.getElementById('main-rpc-details').value.trim(),
                state: document.getElementById('main-rpc-state').value.trim(),
                largeImageKey: document.getElementById('main-rpc-large-image').value.trim(),
                largeImageText: document.getElementById('main-rpc-large-text').value.trim(),
                smallImageKey: document.getElementById('main-rpc-small-image').value.trim(),
                smallImageText: document.getElementById('main-rpc-small-text').value.trim(),
                buttons: rpcButtons
            }
        };

        const result = await api.updateRPCSettings(rpcSettings);
        if (result.success) {
            addLog('✅ Ana bot RPC ayarları kaydedildi.');
        } else {
            showNotification('Hata', 'RPC ayarları kaydedilemedi.', 'error');
        }
    });
}
    // --- Notifications ---
    function showNotification(title, message, type = 'info') {
        // This is a placeholder. A more robust implementation could use a dedicated notification library.
        alert(`${title}: ${message}`);
    }

    function createRPCButtonRow(button = { label: '', url: '' }) {
        const div = document.createElement('div');
        div.className = 'rpc-button-row';
        div.innerHTML = `
            <input type="text" class="rpc-btn-label" placeholder="Buton Adı" value="${button.label}">
            <input type="text" class="rpc-btn-url" placeholder="URL" value="${button.url}">
            <button class="btn-remove btn-remove-rpc-button">Kaldır</button>
        `;
        div.querySelector('.btn-remove-rpc-button').addEventListener('click', () => div.remove());
        return div;
    }

    function createChannelConfigRow(channelConfig = { channelId: '', commandSource: 'ownCommands', commands: [] }) {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel-config-item';

        channelDiv.innerHTML = `
            <div class="form-group">
                <label>Kanal ID:</label>
                <input type="text" class="channel-id-input" value="${channelConfig.channelId}">
            </div>
            <div class="form-group">
                <label>Komut Kaynağı:</label>
                <select class="command-source-select">
                    <option value="ownCommands" ${channelConfig.commandSource === 'ownCommands' ? 'selected' : ''}>Kendi Komutları</option>
                    <option value="mainBotCommands" ${channelConfig.commandSource === 'mainBotCommands' ? 'selected' : ''}>Ana Bot Komutları</option>
                    <option value="onlyRandom" ${channelConfig.commandSource === 'onlyRandom' ? 'selected' : ''}>Sadece Rastgele Mesaj</option>
                </select>
            </div>
            <div class="channel-commands-list"></div>
            <button class="btn secondary btn-add-channel-command" style="margin-top: 10px;">+ Komut Ekle</button>
            <button class="btn-remove btn-remove-channel" style="margin-top: 10px;">Kanalı Kaldır</button>
        `;

        const commandsListDiv = channelDiv.querySelector('.channel-commands-list');
        if (channelConfig.commandSource === 'ownCommands' && channelConfig.commands) {
            channelConfig.commands.forEach(command => {
                commandsListDiv.appendChild(createBotCommandRow(command));
            });
        }

        return channelDiv;
    }

    function createBotCommandRow(command = { text: '', minDelay: 8000, maxDelay: 9000 }) {
        const commandDiv = document.createElement('div');
        commandDiv.className = 'bot-command-row';
        commandDiv.innerHTML = `
            <input type="text" class="bot-cmd-text" placeholder="Komut" value="${command.text}">
            <input type="number" class="bot-cmd-min" placeholder="Min Gecikme" value="${command.minDelay}">
            <input type="number" class="bot-cmd-max" placeholder="Max Gecikme" value="${command.maxDelay}">
            <button class="btn-remove btn-remove-bot-command">Kaldır</button>
        `;
        commandDiv.querySelector('.btn-remove-bot-command').addEventListener('click', () => commandDiv.remove());
        return commandDiv;
    }

    // --- Elementler ---
    const customMinimizeBtn = document.getElementById('custom-minimize-btn');
    const customHideBtn = document.getElementById('custom-hide-btn');
    const customCloseBtn = document.getElementById('custom-close-btn');
    const customDevtoolsBtn = document.getElementById('custom-devtools-btn');

    const tokenInput = document.getElementById('token-input');
    const channelInput = document.getElementById('channel-input');
    const commandsList = document.getElementById('commands-list');
    const gemsList = document.getElementById('gems-list');
    const logOutput = document.getElementById('log-output');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const gemSystemEnabledCheckbox = document.getElementById('gem-system-enabled');
    const sideAccountsList = document.getElementById('side-accounts-list');
    const captchaList = document.getElementById('captcha-list');
    const bulkTokenInput = document.getElementById('bulk-token-input');
    const guildIdInput = document.getElementById('guild-id-input');

    // --- Butonlar ---
    const btnToggle = document.getElementById('btn-toggle');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const btnOpenLog = document.getElementById('btn-open-log');
    const btnOpenData = document.getElementById('btn-open-data');
    const btnSendPotato = document.getElementById('send-potato-btn');
    const btnCheckTokens = document.getElementById('btn-check-tokens');
    const btnReset = document.getElementById('btn-reset');
    const btnAddCommand = document.getElementById('btn-add-command');
    const btnAddGem = document.getElementById('btn-add-gem');
    const btnToggleRandomBots = document.getElementById('btn-toggle-random-bots');
    const btnResetPotatoLog = document.getElementById('btn-reset-potato-log');
    const btnToggleSending = document.getElementById('btn-toggle-sending');
    const btnBulkAddTokens = document.getElementById('btn-bulk-add-tokens');
    const btnCreateChannels = document.getElementById('btn-create-channels');

    let autoScroll = true;

    // --- Unified Side Account Management ---
    async function renderAccountConfigs(type) {
        const [tokenData, botConfigs] = await Promise.all([api.getTokenData(), api.getRandomBots()]);
        const container = type === 'config' ? document.getElementById('account-config-list') : document.getElementById('potato-account-list');
        container.innerHTML = '';

        if (!tokenData || tokenData.length === 0) {
            container.innerHTML = '<p>Henüz yan hesap eklenmemiş.</p>';
            return;
        }

        tokenData.forEach(account => {
            const botConfig = botConfigs.find(c => c.token === account.token) || { channels: [] };
            container.appendChild(createAccountCard(account, botConfig, type));
        });
    }

    function createAccountCard(account, botConfig, type) {
        const card = document.createElement('div');
        card.className = 'account-config-card';
        card.dataset.token = account.token;

        const statusClass = account.status === 'valid' ? 'valid' : 'invalid';
        const avatarUrl = account.avatarURL || 'icon.ico';

        let cardContent = `
            <div class="account-card-header">
                <img src="${avatarUrl}" class="account-avatar" alt="Avatar">
                <div class="account-info">
                    <span class="account-username">${account.username || 'N/A'}</span>
                    <span class="account-token-masked">...${account.token.slice(-12)}</span>
                    <span class="account-status ${statusClass}">${account.status}</span>
                </div>
        `;

        if (type === 'config') {
            cardContent += `<button class="btn-toggle-config"><i class="fas fa-chevron-down"></i></button></div>`;
            cardContent += `
                <div class="account-card-body" style="display: none;">
                    <h4>Kanallar</h4>
                    <div class="bot-channels-list"></div>
                    <button class="btn secondary btn-add-channel" style="margin-top: 10px;">+ Kanal Ekle</button>

                    <h4 style="margin-top: 20px;">Mesaj Gönder</h4>
                    <div class="form-group">
                        <label for="send-message-channel-${account.token.slice(-6)}">Kanal ID:</label>
                        <input type="text" id="send-message-channel-${account.token.slice(-6)}" class="send-message-channel-input" placeholder="Mesaj gönderilecek kanal ID">
                    </div>
                    <div class="form-group">
                        <label for="send-message-text-${account.token.slice(-6)}">Mesaj:</label>
                        <input type="text" id="send-message-text-${account.token.slice(-6)}" class="send-message-text-input" placeholder="Gönderilecek mesaj">
                    </div>
                    <button class="btn primary btn-send-account-message" data-token="${account.token}">Mesaj Gönder</button>
                </div>
            `;
        } else if (type === 'potato') {
            cardContent += `<button class="btn primary btn-send-potato" data-token="${account.token}">Gönder</button></div>`;
        }

        card.innerHTML = cardContent;

        if (type === 'config') {
            const channelsListDiv = card.querySelector('.bot-channels-list');
            if (botConfig.channels) {
                botConfig.channels.forEach(channelConfig => {
                    channelsListDiv.appendChild(createChannelConfigRow(channelConfig));
                });
            }
        }

        return card;
    }

    async function renderSideBotRpcSettings() {
        const container = document.getElementById('side-bots-rpc-tab');
        const settings = await api.getSettings();
        container.innerHTML = `
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="use-main-rpc-for-side-bots" ${settings.useMainRpcForSideBots ? 'checked' : ''}>
                    Yan hesaplar için ana botun RPC ayarlarını kullan
                </label>
            </div>
        `;
    }

    async function saveSideAccountConfig(card) {
        const token = card.dataset.token;
        
        const newChannels = [];
        const channelItems = card.querySelectorAll('.channel-config-item');
        channelItems.forEach(channelItem => {
            const channelId = channelItem.querySelector('.channel-id-input').value.trim();
            if (!channelId) return;

            const commandSource = channelItem.querySelector('.command-source-select').value;
            const newChannelConfig = { channelId, commandSource, commands: [] };

            if (commandSource === 'ownCommands') {
                const commandRows = channelItem.querySelectorAll('.bot-command-row');
                commandRows.forEach(commandRow => {
                    const text = commandRow.querySelector('.bot-cmd-text').value.trim();
                    if (text) {
                        newChannelConfig.commands.push({ 
                            text, 
                            minDelay: parseInt(commandRow.querySelector('.bot-cmd-min').value) || 8000,
                            maxDelay: parseInt(commandRow.querySelector('.bot-cmd-max').value) || 9000
                        });
                    }
                });
            }
            newChannels.push(newChannelConfig);
        });

        const allConfigs = await api.getRandomBots();
        let botConfig = allConfigs.find(c => c.token === token);
        if (botConfig) {
            botConfig.channels = newChannels;
        } else {
            allConfigs.push({ token, channels: newChannels });
        }

        await api.updateRandomBots(allConfigs);
    }

    // Event delegation for the whole list
    document.getElementById('account-config-list').addEventListener('click', async (event) => {
        console.log('Click event on account-config-list', event.target);
        const target = event.target;

        const toggleButton = target.closest('.btn-toggle-config');
        if (toggleButton) {
            console.log('Clicked btn-toggle-config or its child');
            const card = toggleButton.closest('.account-config-card');
            const body = card.querySelector('.account-card-body');
            const icon = toggleButton.querySelector('i');

            if (body) {
                console.log('Before toggle: body element', body, 'display:', body.style.display);
                const isHidden = body.style.display === 'none' || body.style.display === '';
                body.style.display = isHidden ? 'block' : 'none';
                console.log('After toggle: body element', body, 'display:', body.style.display);

                if (icon) {
                    icon.classList.toggle('rotated', isHidden);
                }
            }
        }
        if (target.classList.contains('btn-add-channel')) {
            console.log('Clicked btn-add-channel');
            const channelsListDiv = target.closest('.account-card-body').querySelector('.bot-channels-list');
            channelsListDiv.appendChild(createChannelConfigRow());
        }

        if (target.classList.contains('btn-remove-channel')) {
            target.closest('.channel-config-item').remove();
            saveSideAccountConfig(target.closest('.account-config-card'));
        }

        if (target.classList.contains('btn-add-channel-command')) {
            const commandsListDiv = target.closest('.channel-config-item').querySelector('.channel-commands-list');
            commandsListDiv.appendChild(createBotCommandRow());
        }

        if (target.classList.contains('btn-remove-bot-command')) {
            target.closest('.bot-command-row').remove();
            saveSideAccountConfig(target.closest('.account-config-card'));
        }

        if (target.classList.contains('btn-send-account-message')) {
            const card = target.closest('.account-config-card');
            const token = target.dataset.token;
            const channelInput = card.querySelector(`.send-message-channel-input`);
            const messageInput = card.querySelector(`.send-message-text-input`);
            const channelId = channelInput.value.trim();
            const messageText = messageInput.value.trim();

            if (!channelId || !messageText) {
                showNotification('Hata', 'Lütfen kanal ID ve mesaj girin.', 'error');
                return;
            }

            addLog(`✉️ Sending message from ...${token.slice(-6)} to #${channelId.slice(-6)}: "${messageText}"`);
            const result = await api.sendChannelMessage(token, channelId, messageText);

            if (result.success) {
                addLog(`✅ Message sent successfully.`);
                messageInput.value = ''; // Clear message input after sending
            } else {
                addLog(`❌ Failed to send message: ${result.error}`);
                showNotification('Hata', `Mesaj gönderilemedi: ${result.error}`, 'error');
            }
        }
    });

    document.getElementById('account-config-list').addEventListener('input', async (event) => {
        const target = event.target;
        if (target.matches('input, select, textarea')) {
            saveSideAccountConfig(target.closest('.account-config-card'));
        }
    });

    document.getElementById('side-bots-rpc-tab').addEventListener('change', async (event) => {
        const target = event.target;

        if (target.id === 'use-main-rpc-for-side-bots') {
            await api.updateSetting('useMainRpcForSideBots', target.checked);
        }
    });


    btnBulkAddTokens.addEventListener('click', async () => {
        const tokens = bulkTokenInput.value.trim();
        if (!tokens) {
            showNotification('Hata', 'Lütfen en az bir token girin.', 'error');
            return;
        }
        addLog('💾 Saving and checking new tokens...');
        await api.saveTokens(tokens);
        await api.checkTokens();
        await renderAccountConfigs(); // Rerender the new unified list
        bulkTokenInput.value = ''; // Clear textarea after adding
        addLog('✅ Tokens saved and checked.');
    });



    function createChannelConfigRow(channelConfig = { channelId: '', commandSource: 'ownCommands', commands: [] }) {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel-config-item';

        // Channel ID and Command Source
        let content = `
            <div class="form-group">
                <label>Kanal ID:</label>
                <input type="text" class="channel-id-input" value="${channelConfig.channelId}">
            </div>
            <div class="form-group">
                <label>Komut Kaynağı:</label>
                <select class="command-source-select">
                    <option value="ownCommands" ${channelConfig.commandSource === 'ownCommands' ? 'selected' : ''}>Kendi Komutları</option>
                    <option value="mainBotCommands" ${channelConfig.commandSource === 'mainBotCommands' ? 'selected' : ''}>Ana Bot Komutları</option>
                    <option value="onlyRandom" ${channelConfig.commandSource === 'onlyRandom' ? 'selected' : ''}>Sadece Rastgele Mesaj</option>
                </select>
            </div>
            <div class="channel-commands-list"></div>
            <button class="btn secondary btn-add-channel-command">+ Komut Ekle</button>
            <button class="btn-remove btn-remove-channel">Kanalı Kaldır</button>
        `;

        channelDiv.innerHTML = content;

        const commandsListDiv = channelDiv.querySelector('.channel-commands-list');
        if (channelConfig.commandSource === 'ownCommands' && channelConfig.commands) {
            channelConfig.commands.forEach(command => {
                const commandRow = createBotCommandRow(command);
                commandsListDiv.appendChild(commandRow);
            });
        }

        return channelDiv;
    }



    btnCreateChannels.addEventListener('click', async () => {
        const guildId = guildIdInput.value.trim();
        if (!guildId) {
            showNotification('Hata', 'Lütfen bir Sunucu ID girin.', 'error');
            return;
        }

        addLog(`🏭 Creating and configuring channels in guild ${guildId}...`);
        const result = await api.createChannelsForTokens(guildId);

        if (result.success) {
            addLog(`✅ Channel creation process completed successfully for ${result.count} accounts.`);
        } else {
            addLog(`❌ Channel creation failed: ${result.error}`);
        }
    });


    // --- Dynamic Captcha Card Management ---
    function addOrUpdateCaptchaCard({ token, imageUrl, username, channelId }) {
        addLog(`🚨 Captcha received for ${username}.`);

        // Switch to the captcha solver tab automatically
        const captchaMenuItem = document.querySelector('[data-section="captcha-solver-section"]');
        if (captchaMenuItem) {
            captchaMenuItem.click();
        }

        const cardId = `captcha-card-${token.replace(/\./g, '-')}`;
        let card = document.getElementById(cardId);

        if (card) {
            // Card already exists, just update the image
            const img = card.querySelector('img');
            img.src = imageUrl;
            addLog(`🖼️ Updated captcha image for ${username}.`);
        } else {
            // Create a new card
            card = document.createElement('div');
            card.id = cardId;
            card.className = 'captcha-card';
            card.dataset.token = token;
            card.dataset.channelId = channelId;

            card.innerHTML = `
                <h3>${username}</h3>
                <img src="${imageUrl}" alt="Captcha Image">
                <div class="input-group">
                    <input type="text" placeholder="Captcha kodunu girin...">
                    <button class="btn primary btn-solve">Gönder</button>
                </div>
            `;

            captchaList.appendChild(card);

            const solveButton = card.querySelector('.btn-solve');
            const inputField = card.querySelector('input[type="text"]');

            solveButton.addEventListener('click', async () => {
                const solution = inputField.value.trim();
                if (!solution) {
                    showNotification('Hata', 'Lütfen captcha kodunu girin.', 'error');
                    return;
                }

                addLog(`🖼️ Sending captcha solution for ${username}: ${solution}`);
                const result = await api.sendCaptchaSolution(token, solution, channelId);

                if (result.success) {
                    addLog(`✅ Captcha for ${username} solved successfully.`);
                    card.remove(); 
                } else {
                    addLog(`❌ Failed to send captcha for ${username}: ${result.error}`);
                }
            });

            inputField.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    solveButton.click();
                }
            });
        }
    }




    // --- Komut Yönetimi ---
    function createCommandRow(cmd = { text: '', minDelay: 8000, maxDelay: 9000 }) {
        const div = document.createElement('div');
        div.className = 'command-row';
        div.innerHTML = `
            <input type="text" class="cmd-text" placeholder="Gönderilecek komut (örn: OwO hunt)" value="${cmd.text}">
            <input type="number" class="cmd-min" placeholder="Min Gecikme (ms)" value="${cmd.minDelay}">
            <input type="number" class="cmd-max" placeholder="Max Gecikme (ms)" value="${cmd.maxDelay}">
            <button class="btn-remove">Kaldır</button>
        `;
        div.querySelector('.btn-remove').onclick = () => {
            div.remove();
            saveCommands();
        };
        div.querySelectorAll('input').forEach(input => input.addEventListener('input', saveCommands));
        return div;
    }

    function getCommands() {
        return Array.from(commandsList.children).map(row => ({
            text: row.querySelector('.cmd-text').value.trim(),
            minDelay: parseInt(row.querySelector('.cmd-min').value) || 8000,
            maxDelay: parseInt(row.querySelector('.cmd-max').value) || 9000
        })).filter(cmd => cmd.text);
    }

    function saveCommands() { 
        api.updateCommands(getCommands()); 
    }

    function loadCommands(commands) {
        commandsList.innerHTML = '';
        if (commands && commands.length > 0) {
            commands.forEach(cmd => commandsList.appendChild(createCommandRow(cmd)));
        }
    }

    // --- Gem Sistemi Yönetimi ---
    function createGemRow(gem = { emojiId: '', command: '', enabled: true }) {
        const div = document.createElement('div');
        div.className = 'gem-row';
        div.innerHTML = `
            <input type="text" class="gem-emoji-id" placeholder="Emoji ID (örn: 123456789)" value="${gem.emojiId}">
            <input type="text" class="gem-command" placeholder="Tetiklenecek Komut (örn: OwO use 1)" value="${gem.command}">
            <label class="checkbox-label">
                <input type="checkbox" class="gem-enabled" ${gem.enabled ? 'checked' : ''}> Aktif
            </label>
            <button class="btn-remove">Kaldır</button>
        `;
        div.querySelector('.btn-remove').onclick = () => {
            div.remove();
            saveGems();
        };
        div.querySelectorAll('input').forEach(input => input.addEventListener('input', saveGems));
        return div;
    }

    function getGems() {
        return Array.from(gemsList.children).map(row => ({
            emojiId: row.querySelector('.gem-emoji-id').value.trim(),
            command: row.querySelector('.gem-command').value.trim(),
            enabled: row.querySelector('.gem-enabled').checked
        })).filter(gem => gem.emojiId && gem.command);
    }

    function saveGems() { 
        api.updateGems(getGems()); 
    }

    function loadGems(gems) {
        gemsList.innerHTML = '';
        if (gems && gems.length > 0) {
            gems.forEach(gem => gemsList.appendChild(createGemRow(gem)));
        }
    }

    // --- Otomatik Kaydetme ---
    const idToKeyMap = {
        'token-input': 'token',
        'channel-input': 'channelId',
        'gem-system-enabled': 'gemSystemEnabled'
    };

    Object.keys(idToKeyMap).forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            const eventType = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                const key = idToKeyMap[id];
                const value = input.type === 'checkbox' ? input.checked : input.value;
                api.updateSetting(key, value);
            });
        }
    });

    // --- Buton Event Listeners ---
    if (btnToggle) {
        btnToggle.onclick = async () => {
            const res = await api.toggleBot();
            if (res.error) {
                alert('❌ Hata: ' + res.error);
            }
        };
    }

    if (btnToggleSending) {
        btnToggleSending.onclick = () => api.toggleCommandSending();
    }

    if (btnSendPotato) {
        btnSendPotato.onclick = () => {
            api.sendPotato();
            addLog('🥔 Patates gönderiliyor!');
        };
    }

    if (btnExport) {
        btnExport.onclick = async () => {
            const success = await api.exportSettings();
            if (success) {
                alert('✅ Ayarlar dışa aktarıldı!');
                addLog('📤 Ayarlar dışa aktarıldı');
            } else {
                alert('❌ Dışa aktarma başarısız!');
            }
        };
    }

    function loadRpcSettings(rpcSettings) {
        if (rpcSettings) {
            mainRpcEnabledCheckbox.checked = rpcSettings.enabled || false;
            mainRpcSettings.style.display = rpcSettings.enabled ? 'block' : 'none';
            
            document.getElementById('main-rpc-app-id').value = rpcSettings.settings.applicationId || '';
            document.getElementById('main-rpc-name').value = rpcSettings.settings.name || '';
            document.getElementById('main-rpc-details').value = rpcSettings.settings.details || '';
            document.getElementById('main-rpc-state').value = rpcSettings.settings.state || '';
            document.getElementById('main-rpc-large-image').value = rpcSettings.settings.largeImageKey || '';
            document.getElementById('main-rpc-large-text').value = rpcSettings.settings.largeImageText || '';
            document.getElementById('main-rpc-small-image').value = rpcSettings.settings.smallImageKey || '';
            document.getElementById('main-rpc-small-text').value = rpcSettings.settings.smallImageText || '';
            
            mainRpcButtonsList.innerHTML = '';
            if (rpcSettings.settings.buttons) {
                rpcSettings.settings.buttons.forEach(btn => {
                    mainRpcButtonsList.appendChild(createRPCButtonRow(btn));
                });
            }
        }
    }

    async function loadAllSettings() {
        const data = await api.getSettings();
        if (data) {
            tokenInput.value = data.token || '';
            channelInput.value = data.channelId || '';
            gemSystemEnabledCheckbox.checked = data.gemSystemEnabled || false;
            loadCommands(data.commands);
            loadGems(data.gems);
            loadRpcSettings(data.rpcSettings);

            const useMainRpcForSideBotsCheckbox = document.getElementById('use-main-rpc-for-side-bots');
            if (useMainRpcForSideBotsCheckbox) {
                useMainRpcForSideBotsCheckbox.checked = data.useMainRpcForSideBots || false;
            }
        }
    }

    if (btnImport) {
        btnImport.onclick = async () => {
            const success = await api.importSettings();
            if (success) {
                await loadAllSettings();
                alert('✅ Ayarlar içe aktarıldı!');
                addLog('📥 Ayarlar içe aktarıldı');
            }
        };
    }

    if (btnOpenLog) {
        btnOpenLog.onclick = () => {
            api.openLogFile();
            addLog('📄 Log dosyası açılıyor...');
        };
    }

    if (btnOpenData) {
        btnOpenData.onclick = () => {
            api.openDataFolder();
            addLog('📁 Veri klasörü açılıyor...');
        };
    }

    if (btnCheckTokens) {
        btnCheckTokens.onclick = async () => {
            addLog('🔍 Token kontrol işlemi başlatıldı...');
            btnCheckTokens.disabled = true;
            btnCheckTokens.textContent = '⏳ Kontrol Ediliyor...';
            try {
                await api.checkTokens();
                showNotification('✅ Tamamlandı', 'Token kontrolü bitti.', 'success');
            } catch (error) {
                showNotification('❌ Hata', `Token kontrolü başarısız: ${error.message}`, 'error');
            } finally {
                btnCheckTokens.disabled = false;
                btnCheckTokens.textContent = '🔍 Token Kontrol';
            }
        };
    }

    if (btnReset) {
        btnReset.onclick = () => {
            if (confirm('⚠️ Tüm ayarları sıfırlamak istediğinize emin misiniz?')) {
                api.updateSetting('reset', true);
                setTimeout(() => location.reload(), 500);
            }
        };
    }

    if (btnAddCommand) {
        btnAddCommand.onclick = () => {
            commandsList.appendChild(createCommandRow());
        };
    }

    if (btnAddGem) {
        btnAddGem.onclick = () => {
            gemsList.appendChild(createGemRow());
        };
    }

    if (btnToggleRandomBots) {
        btnToggleRandomBots.onclick = async () => {
            addLog('🤖 Toggling random bots...');
            const result = await api.toggleRandomBots();
            if (result.status === 'started') {
                btnToggleRandomBots.textContent = '🛑 Rastgele Botları Durdur';
                btnToggleRandomBots.classList.remove('primary');
                btnToggleRandomBots.classList.add('secondary');
                showNotification('Başarılı', 'Rastgele botlar başlatıldı.', 'success');
            } else {
                btnToggleRandomBots.textContent = '🤖 Rastgele Botları Başlat';
                btnToggleRandomBots.classList.remove('secondary');
                btnToggleRandomBots.classList.add('primary');
                showNotification('Başarılı', 'Rastgele botlar durduruldu.', 'success');
            }
            renderAccountConfigs('config'); // Re-render to update bot statuses
        };
    }




    if (btnResetPotatoLog) {
        btnResetPotatoLog.onclick = async () => {
            if (confirm('🥔 Patates zamanlayıcılarını sıfırlamak istediğinize emin misiniz?')) {
                const result = await api.resetPotatoLog();
                if (result.success) {
                } else {
                    showNotification('❌ Hata', `Sıfırlama başarısız: ${result.error}`, 'error');
                }
            }
        };
    }

    // Custom Title Bar Buttons
    if (customMinimizeBtn) customMinimizeBtn.onclick = () => api.minimizeWindow();
    if (customHideBtn) customHideBtn.onclick = () => api.hideWindow();
    if (customCloseBtn) customCloseBtn.onclick = () => api.closeWindow();
    if (customDevtoolsBtn) customDevtoolsBtn.onclick = () => api.openDevTools();

    // --- Yardımcı Fonksiyonlar ---

    window.togglePasswordVisibility = function(inputOrId, button) {
        let input = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        }
    };

    window.clearLog = async function() {
        logOutput.textContent = '';
        addLog('🗑️ Log temizlendi');
        await api.clearLogFile();
    };

    window.toggleAutoScroll = function() {
        autoScroll = !autoScroll;
        addLog(`${autoScroll ? '📌' : '📍'} Auto-scroll ${autoScroll ? 'aktif' : 'pasif'}`);
    };

    window.exportLog = function() {
        const log = logOutput.textContent;
        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.download = `selfbot-log-${date}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('💾 Log dosyası kaydedildi');
    };

    // --- Log Fonksiyonu ---
    function addLog(message) {
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        logOutput.textContent += `[${timestamp}] ${message}\n`;
        if (autoScroll) {
            logOutput.scrollTop = logOutput.scrollHeight;
        }
    }

    // --- Başlangıç Verisi Yükleme ---
    loadAllSettings();

    // --- Event Listeners ---
    api.onLog((_, msg) => {
        addLog(msg);
    });

    api.onCaptchaRequired((_, data) => {
        addOrUpdateCaptchaCard(data);
    });

    api.onStatus((_, data) => {
        const { status, isRunning, isSendingCommands } = data;

        statusText.textContent = `Durum: ${status}`;
        statusIndicator.className = '';
        btnToggle.disabled = false;

        switch (status) {
            case 'Çalışıyor':
                statusIndicator.classList.add('active');
                btnToggle.textContent = '⏸️ Botu Durdur';
                btnToggle.classList.remove('primary');
                btnToggle.classList.add('secondary');
                btnToggleSending.style.display = 'inline-block';
                if (isSendingCommands) {
                    btnToggleSending.textContent = '⏸️ Gönderimi Durdur';
                } else {
                    btnToggleSending.textContent = '▶️ Gönderimi Başlat';
                }
                break;
            case 'Durduruldu':
                btnToggle.textContent = '▶️ Botu Başlat';
                btnToggle.classList.remove('secondary');
                btnToggle.classList.add('primary');
                btnToggleSending.style.display = 'none';
                break;
            case 'Başlatılıyor...':
                statusIndicator.classList.add('loading');
                btnToggle.textContent = '⏳ Başlatılıyor...';
                btnToggle.disabled = true;
                break;
            case 'Hata':
                btnToggle.textContent = '▶️ Botu Başlat';
                break;
        }
    });

    api.onFocusOnCaptcha(() => {
        const captchaMenuItem = document.querySelector('[data-section="captcha-solver-section"]');
        if (captchaMenuItem) {
            captchaMenuItem.click();
        }
    });
});