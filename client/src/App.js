import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Series from './pages/Series';
import Anime from './pages/Anime';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Contact from './pages/Contact';
import Navbar from './components/Navbar';
import Watchlist from './pages/Watchlist';
import Search from './pages/Search';
import HeroSpotlight from './components/HeroSpotlight';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/movies" element={<PrivateRoute><Movies /></PrivateRoute>} />
        <Route path="/series" element={<PrivateRoute><Series /></PrivateRoute>} />
        <Route path="/anime" element={<PrivateRoute><Anime /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/contact" element={<PrivateRoute><Contact /></PrivateRoute>} />
        <Route path="/watchlist" element={<PrivateRoute><Watchlist /></PrivateRoute>} />
        <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
