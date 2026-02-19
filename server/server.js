const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const tmdbRoutes = require('./routes/tmdb');
const db = require('./config/db');
require('./utils/bootstrapAdmin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic security hardening
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, // 300 requests / 15 mins per IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  cors({
    origin: ["http://localhost:3000", "https://indiflix.vercel.app"], // ✅ Use frontend URL
    methods: "GET,POST,PUT,DELETE",
    credentials: true, // ✅ Allow authentication headers
  })
);
app.use(bodyParser.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/media', require('./routes/media'));
app.use('/api/auth', authRoutes);
app.use('/api/tmdb', tmdbRoutes);

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


