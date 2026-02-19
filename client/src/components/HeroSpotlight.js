import React, { useEffect, useState } from 'react';
import './HeroSpotlight.css';

const HeroSpotlight = ({ items = [], onPlay, onMore }) => {
  const [index, setIndex] = useState(0);

  const slides = items.slice(0, 6);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;

  const current = slides[index];
  const bg =
    current.backdrop ||
    current.backdrop_url ||
    current.landscape ||
    current.hero ||
    current.thumbnail_url ||
    current.poster ||
    current.poster_url ||
    '';

  return (
    <div className="hero-spotlight">
      <div
        key={`bg-${current.id || index}`}
        className="hero-bg"
        style={{ backgroundImage: bg ? `url(${bg})` : 'none' }}
      />
      <div className="hero-overlay" />
      <div className="hero-content" key={`content-${current.id || index}`}>
        <h1 className="hero-title">{current.title}</h1>
        <div className="hero-meta">
          {current.release_year && <span className="pill"> {current.release_year} </span>}
          {current.genre && <span className="pill"> {current.genre} </span>}
          {current.type && <span className="pill"> {current.type} </span>}
        </div>
        <p className="hero-desc">
          {(current.description || '').slice(0, 220)}
          {(current.description || '').length > 220 ? '…' : ''}
        </p>
        <div className="hero-actions">
          <button className="btn hero-play" onClick={() => onPlay && onPlay(current)}>
            ▶ Play
          </button>
          <button className="btn hero-more" onClick={() => onMore && onMore(current)}>
            ℹ More Info
          </button>
        </div>
      </div>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === index ? 'active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSpotlight;
