const connection = require('../config/db');

const User = {
  findOne: (email, callback) => {
    const query = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    connection.query(query, [email], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results[0]); // Return first user found
    });
  },

  create: (userData, callback) => {
    const query = 'INSERT INTO users (name, email, profilePicture, authMethod) VALUES (?, ?, ?, ?)';
    const values = [userData.name, userData.email, userData.profilePicture, userData.authMethod];
    connection.query(query, values, (err, result) => {
      if (err) return callback(err, null);
      callback(null, result);
    });
  },
};

module.exports = User;
