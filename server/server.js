const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mediaRoutes = require('./routes/mediaRoutes');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = 5000;


app.use(
  cors({
    origin: ["https://indiflix.vercel.app"], // ✅ Use frontend URL
    methods: "GET,POST,PUT,DELETE",
    credentials: true, // ✅ Allow authentication headers
  })
);
app.use(bodyParser.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/media', require('./routes/media'));
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

