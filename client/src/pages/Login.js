import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // ✅ Redirect function

  useEffect(() => {
    // ✅ Redirect to home if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/'); // Redirect to Home
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`https://indiflix.onrender.com/api/users/login`, { email, password });
      localStorage.setItem('token', response.data.token); // ✅ Save JWT token
      navigate('/'); // ✅ Redirect to Home
    } catch (error) {
      console.error('Login failed:', error.response ? error.response.data : error.message);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post(
        `https://indiflix.onrender.com/api/auth/google-login`,
        { token: credentialResponse.credential },
        { withCredentials: true }
      );

      localStorage.setItem('token', response.data.token); // ✅ Save JWT token
      navigate('/'); // ✅ Redirect to Home after login
    } catch (error) {
      console.error('Google login failed:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>

        {/* Google Login */}
        <GoogleLogin onSuccess={handleGoogleLoginSuccess} onError={() => console.log('Login Failed')} />

        <p>New to Indiflix? <Link to="/signup">Sign up now</Link>.</p>
      </div>
    </div>
  );
};

export default Login;
