const express = require('express');
const router  = express.Router();
const { getProfile, updateProfile } = require('../controllers/profileController');
const { requireAuth }               = require('../middleware/auth');
const { generalLimiter }            = require('../middleware/rateLimiter');

router.get('/',   requireAuth, generalLimiter, getProfile);
router.patch('/', requireAuth, generalLimiter, updateProfile);

module.exports = router;
