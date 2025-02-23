const connection = require('../config/db');

const Media = {
  create: (mediaData, callback) => {
    const query = `
      INSERT INTO media (title, description, type, cloudinary_url, thumbnail_url, duration, release_year, genre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      mediaData.title,
      mediaData.description,
      mediaData.type,
      mediaData.cloudinary_url,
      mediaData.thumbnail_url,
      mediaData.duration,
      mediaData.release_year,
      mediaData.genre,
    ];

    connection.query(query, values, callback);
  },

  getAll: (callback) => {
    const query = 'SELECT * FROM media';
    connection.query(query, callback);
  },
};

module.exports = Media;