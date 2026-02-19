import React from 'react';
import './Contact.css';

const Contact = () => {
  return (
    <div className="contact-wrapper">
      <div className="contact-hero">
        <p className="pill">Support · 24/7</p>
        <h1>Let’s talk about your next binge-worthy experience.</h1>
        <p>
          We’re here to help with partnerships, support, or feedback. Drop us a line and we’ll
          respond fast.
        </p>
        <div className="cta-buttons">
          <a className="btn" href="mailto:himanshu.kira@gmail.com">Email Us</a>
          <a className="btn" href="tel:+918579946268">Call Now</a>
        </div>
      </div>

      <div className="contact-card glass-card">
        <div className="contact-grid">
          <div className="contact-row">
            <div className="icon">👤</div>
            <div>
              <div className="label">Name</div>
              <div className="value">Himanshu Choudhary</div>
            </div>
          </div>
          <div className="contact-row">
            <div className="icon">✉️</div>
            <div>
              <div className="label">Email</div>
              <div className="value">himanshu.kira@gmail.com</div>
            </div>
          </div>
          <div className="contact-row">
            <div className="icon">📞</div>
            <div>
              <div className="label">Phone</div>
              <div className="value">+91 8579946268</div>
            </div>
          </div>
          <div className="contact-row">
            <div className="icon">💬</div>
            <div>
              <div className="label">Chat</div>
              <div className="value">We usually reply within minutes.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
