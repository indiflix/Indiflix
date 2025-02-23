import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import './VideoPlayer.css';

const VideoPlayer = ({ url, onNextEpisode }) => {
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [videoQuality, setVideoQuality] = useState('auto');
  const [showControls, setShowControls] = useState(true);
  const qualityOptions = ['auto', '360p', '480p', '720p', '1080p'];
  let timeoutRef = useRef(null);

  // ✅ Toggle Play/Pause
  const togglePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  // ✅ Seek Video by 10s (Forward/Backward)
  const seekVideo = useCallback((seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(playedSeconds + seconds, 'seconds');
    }
  }, [playedSeconds]);

  // ✅ Handle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.getElementById('video-player-container').requestFullscreen();
    }
  }, []);

  // ✅ Auto-hide controls after inactivity
  const resetControlVisibility = () => {
    setShowControls(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); // Hide controls after 3 seconds of inactivity
  };

  useEffect(() => {
    const handleUserActivity = () => resetControlVisibility();
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);

    return () => {
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
    };
  }, []);

  // ✅ Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      resetControlVisibility();
      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          seekVideo(10);
          break;
        case 'ArrowLeft':
          seekVideo(-10);
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [seekVideo, togglePlayPause, toggleFullscreen]);

  return (
    <div id="video-player-container" className="video-player">
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        controls={false}
        width="100%"
        height="100%"
        onProgress={({ playedSeconds }) => setPlayedSeconds(playedSeconds)}
      />

      {/* ✅ Custom Controls (Auto-Hide on Inactivity) */}
      <div className={`controls ${showControls ? '' : 'hidden'}`}>
        <button onClick={togglePlayPause}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button onClick={() => seekVideo(-10)}>⏪ 10s</button>
        <button onClick={() => seekVideo(10)}>⏩ 10s</button>
        <button onClick={toggleFullscreen}>🔳 Fullscreen (F)</button>

        {/* ✅ Quality Selection */}
        <select onChange={(e) => setVideoQuality(e.target.value)} value={videoQuality}>
          {qualityOptions.map((quality) => (
            <option key={quality} value={quality}>{quality}</option>
          ))}
        </select>

        {/* ✅ Next Episode Button (Only for Series & Anime) */}
        {onNextEpisode && <button onClick={onNextEpisode}>⏭ Next Episode</button>}
      </div>
    </div>
  );
};

export default VideoPlayer;
