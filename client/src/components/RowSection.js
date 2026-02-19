import React from 'react';
import './RowSection.css';

const RowSection = ({ title, items = [], onCardClick }) => {
  if (!items || items.length === 0) return null;
  return (
    <section className="row-section">
      <div className="row-header">
        <h3>{title}</h3>
      </div>
      <div className="row-scroll">
        {items.map((item) => (
          <div
            key={`${item.type || 'item'}-${item.id}`}
            className="row-card card"
            role="button"
            onClick={() => onCardClick && onCardClick(item)}
          >
            {item.thumbnail_url || item.poster || item.poster_url ? (
              <img
                src={item.thumbnail_url || item.poster || item.poster_url}
                alt={item.title}
              />
            ) : (
              <div className="card-placeholder">No poster</div>
            )}
            <div className="card-content">
              <h3>{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RowSection;
