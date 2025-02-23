import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      setUser(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token'); // ✅ Remove token
    setUser(null);
    navigate('/login'); // ✅ Redirect to Login
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">Indiflix</Link>
        <Link to="/movies" className="navbar-link">Movies</Link>
        <Link to="/series" className="navbar-link">Series</Link>
        <Link to="/anime" className="navbar-link">Anime</Link>
      </div>

      <div className="navbar-right">
        <Link to="/contact" className="navbar-link">Contact</Link>
        {user ? (<>
         <Link to="/watchlist" className="navbar-link">Watchlist</Link>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">Login</Link>
            <Link to="/signup" className="navbar-link">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
