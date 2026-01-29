const express = require('express');
const router = express.Router();
const { registerUser } = require('../services/databaseService');
const authMiddleware = require('../middleware/authMiddleware');
const { info, error } = require('../utils/logger');

// Health Check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: 'aNANinAmcugu'
    });
});

// Register User
router.post('/register', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, error: 'Discord token gerekli.' });
    }

    try {
        const { apiKey } = await registerUser(token);
        info(`New user registered.`);
        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla kaydedildi. Bu API anahtarını güvenli bir şekilde saklayın.',
            apiKey: apiKey
        });
    } catch (err) {
        error(`Registration error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Kayıt sırasında sunucu hatası oluştu.' });
    }
});

// Verify API Key (Login)
router.get('/verify', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'API anahtarı geçerli.',
        user: {
            username: req.username || 'Bilinmeyen Kullanıcı',
            id: req.userId
        }
    });
});

module.exports = router;
