const jwt = require('jsonwebtoken');
const { verifyGoogleToken } = require('../utils/googleAuth');
const db = require('../config/db'); 
require('dotenv').config();

const googleLogin = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    console.error('❌ No token received in request body');
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    console.log('✅ Received Google Token:', token);

    // Verify the Google Token
    const payload = await verifyGoogleToken(token);

    if (!payload) {
      console.error('❌ Invalid Google Token');
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    console.log('✅ Google Payload:', payload);

    const { email, name, picture } = payload;

    // Check if the user already exists in MySQL
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('❌ Database Query Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      let user = results[0];

      if (!user) {
        // Insert new user into MySQL
        const insertQuery = `
          INSERT INTO users (name, email, profilePicture, authMethod) 
          VALUES (?, ?, ?, 'google')
        `;
        db.query(insertQuery, [name, email, picture], (err, result) => {
          if (err) {
            console.error('❌ Error inserting user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          console.log('✅ User created:', { name, email });
          user = { id: result.insertId, name, email, profilePicture: picture };
          generateAndSendToken(user, res);
        });
      } else {
        console.log('✅ Existing user:', user);
        generateAndSendToken(user, res);
      }
    });
  } catch (error) {
    console.error('❌ Google login failed:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const generateAndSendToken = (user, res) => {
  try {
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Login successful', token: jwtToken, user });
  } catch (error) {
    console.error('❌ Error generating JWT:', error);
    res.status(500).json({ error: 'JWT generation failed' });
  }
};

module.exports = { googleLogin };
