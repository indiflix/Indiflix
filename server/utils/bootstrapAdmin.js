const bcrypt = require('bcryptjs');
const db = require('../config/db');

const DEFAULT_ADMIN = {
  name: 'Default Admin',
  email: 'himanshu.kira@gmail.com',
  password: 'Him@nshu1',
};

const ensureDefaultAdmin = () => {
  db.query('SELECT id, password FROM users WHERE email = ? LIMIT 1', [DEFAULT_ADMIN.email], (err, results) => {
    if (err) {
      console.error('❌ Admin seed check failed:', err);
      return;
    }

    if (results.length > 0) {
      const hashed = bcrypt.hashSync(DEFAULT_ADMIN.password, 10);
      db.query(
        'UPDATE users SET password = ?, isAdmin = 1 WHERE email = ?',
        [hashed, DEFAULT_ADMIN.email],
        (updateErr) => {
          if (updateErr) {
            console.error('❌ Failed to refresh default admin:', updateErr);
          } else {
            console.log('ℹ️ Default admin refreshed (password & admin flag).');
          }
        }
      );
      return;
    }

    const hashed = bcrypt.hashSync(DEFAULT_ADMIN.password, 10);
    const sql = 'INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, 1)';
    db.query(sql, [DEFAULT_ADMIN.name, DEFAULT_ADMIN.email, hashed], (insertErr) => {
      if (insertErr) {
        console.error('❌ Failed to create default admin:', insertErr);
      } else {
        console.log('✅ Default admin created:', DEFAULT_ADMIN.email);
      }
    });
  });
};

ensureDefaultAdmin();

module.exports = ensureDefaultAdmin;
