const Media = require('../models/mediaModel');
const cloudinary = require('../config/cloudinary');

const uploadMedia = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
    });

    const mediaData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      cloudinary_url: result.secure_url,
      thumbnail_url: result.thumbnail_url,
      duration: result.duration,
      release_year: req.body.release_year,
      genre: req.body.genre,
    };

    Media.create(mediaData, (err, results) => {
      if (err) {
        console.error('Error saving to MySQL:', err);
        res.status(500).json({ error: 'Failed to save media metadata' });
      } else {
        res.status(201).json({ message: 'Media uploaded successfully!', media: results });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload media' });
  }
};

const getAllMedia = (req, res) => {
  Media.getAll((err, results) => {
    if (err) {
      console.error('Error fetching media:', err);
      res.status(500).json({ error: 'Failed to fetch media' });
    } else {
      res.status(200).json(results);
    }
  });
};

module.exports = { uploadMedia, getAllMedia };