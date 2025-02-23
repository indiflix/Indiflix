const express = require('express');
const { googleLogin } = require('../controllers/authController');

const router = express.Router();

// Google Login Route
router.post('/google-login', googleLogin);

module.exports = router;
