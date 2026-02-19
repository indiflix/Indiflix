import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import './VideoPlayer.css';

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (seconds) => {
  if (Number.isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

const SEEK_SMALL = 5;
const SEEK_LARGE = 10;

const VideoPlayer = ({ url, mediaItem = null, onNextEpisode, onPrevEpisode, onClose }) => {
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);
  const [hideCursor, setHideCursor] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playingRef = useRef(false);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  const scheduleHide = useCallback(() => {
    setShowControls(true);
    setHideCursor(false);
    clearTimeout(hideTimer.current);
    if (!playingRef.current) return;
    hideTimer.current = setTimeout(() => {
      if (!isScrubbingRef.current) {
        setShowControls(false);
        setHideCursor(true);
      }
    }, 2000);
  }, []);

  // Start playing when URL changes
  useEffect(() => {
    if (url) {
      setPlaying(true);
      setPlayedSeconds(0);
      const container = document.getElementById('video-player-shell');
      if (container && !document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      }
      scheduleHide();
    }
  }, [url, scheduleHide]);

  useEffect(() => {
    const handleActivity = () => scheduleHide();
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      clearTimeout(hideTimer.current);
    };
  }, [scheduleHide]);

  const togglePlayPause = useCallback(() => setPlaying((p) => !p), []);

  const seekTo = useCallback(
    (seconds) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, 'seconds');
      }
    },
    []
  );

  const seekRelative = useCallback(
    (delta) => {
      setPlayedSeconds((prev) => {
        const next = Math.max(0, prev + delta);
        seekTo(next);
        return next;
      });
    },
    [seekTo]
  );

  const toggleFullscreen = useCallback(() => {
    const container = document.getElementById('video-player-shell');
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const updateContinueWatching = useCallback(
    (played, dur) => {
      if (!mediaItem || !mediaItem.id) return;
      if (!dur || dur < 5) return; // avoid zero/short videos before duration known
      const pct = played / dur;
      const key = 'cw_entries';
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(key)) || [];
      } catch (e) {
        list = [];
      }
      const remaining = list.filter((e) => e.id !== mediaItem.id);
      if (pct >= 0.97 || played < 5) {
        localStorage.setItem(key, JSON.stringify(remaining));
        window.dispatchEvent(new Event('cw-updated'));
        return;
      }
      const entry = {
        id: mediaItem.id,
        title: mediaItem.title || 'Untitled',
        type: mediaItem.type || 'movie',
        poster:
          mediaItem.thumbnail_url ||
          mediaItem.poster ||
          mediaItem.poster_url ||
          null,
        url: mediaItem.hls_url || mediaItem.cloudinary_url || url,
        position: played,
        duration: dur,
        updatedAt: Date.now(),
      };
      remaining.unshift(entry);
      const trimmed = remaining.slice(0, 30);
      localStorage.setItem(key, JSON.stringify(trimmed));
      window.dispatchEvent(new Event('cw-updated'));
    },
    [mediaItem, url]
  );

  const changeVolume = useCallback((delta) => {
    setVolume((v) => {
      const next = Math.min(1, Math.max(0, v + delta));
      if (next > 0) setMuted(false);
      return next;
    });
  }, []);

  useEffect(() => {
    const onFullChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullChange);
    return () => document.removeEventListener('fullscreenchange', onFullChange);
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      scheduleHide();
      const shift = event.shiftKey;
      switch (event.key) {
        case 'k':
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowUp':
          event.preventDefault();
          changeVolume(0.05);
          break;
        case 'ArrowDown':
          event.preventDefault();
          changeVolume(-0.05);
          break;
        case 'ArrowRight':
          seekRelative(shift ? SEEK_LARGE : SEEK_SMALL);
          break;
        case 'ArrowLeft':
          seekRelative(shift ? -SEEK_LARGE : -SEEK_SMALL);
          break;
        case 'l':
          seekRelative(SEEK_LARGE);
          break;
        case 'j':
          seekRelative(-SEEK_LARGE);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          setMuted((m) => !m);
          break;
        case 'n':
        case 'N':
          if (onNextEpisode) onNextEpisode();
          break;
        case 'p':
        case 'P':
          if (onPrevEpisode) onPrevEpisode();
          break;
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen();
          break;
        default:
          if (event.key >= '0' && event.key <= '9' && duration) {
            const pct = Number(event.key) / 10;
            seekTo(duration * pct);
          }
          break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [duration, seekRelative, toggleFullscreen, togglePlayPause, scheduleHide, onNextEpisode, onPrevEpisode, changeVolume, seekTo]);

  const progressPct = duration ? Math.min(100, (playedSeconds / duration) * 100) : 0;

  if (!url) return null;

  return (
    <div id="video-player-overlay" className="video-player-overlay">
      <div
        id="video-player-shell"
        className={`video-player-shell ${hideCursor ? 'hide-cursor' : ''}`}
        onMouseMove={scheduleHide}
      >
        <ReactPlayer
          key={url}
          ref={playerRef}
          url={url}
          playing={playing}
          muted={muted}
          controls={false}
          width="100%"
          height="100%"
          playbackRate={playbackRate}
          volume={muted ? 0 : volume}
          onProgress={({ playedSeconds }) => {
            if (!isScrubbing) setPlayedSeconds(playedSeconds);
            updateContinueWatching(playedSeconds, duration);
          }}
          onDuration={(d) => setDuration(d)}
          onEnded={() => updateContinueWatching(duration, duration)}
        />

        <div className={`vp-controls ${showControls ? '' : 'hidden'}`}>
          <div className="vp-timeline" style={{ '--seek-progress': `${progressPct}%` }}>
            <span className="time">{formatTime(playedSeconds)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0.01}
              step="0.25"
              value={playedSeconds}
              onMouseDown={() => {
                setIsScrubbing(true);
                clearTimeout(hideTimer.current);
              }}
              onTouchStart={() => {
                setIsScrubbing(true);
                clearTimeout(hideTimer.current);
              }}
              onChange={(e) => {
                setPlayedSeconds(Number(e.target.value));
              }}
              onMouseUp={(e) => {
                setIsScrubbing(false);
                seekTo(Number(e.target.value));
                scheduleHide();
              }}
              onTouchEnd={(e) => {
                setIsScrubbing(false);
                seekTo(Number(e.target.value));
                scheduleHide();
              }}
            />
            <span className="time">{formatTime(duration)}</span>
          </div>

          <div className="vp-bottom">
            <div className="vp-left">
              <button title="Rewind 10 seconds (J)" onClick={() => seekRelative(-10)}>
                ⏪ 10
              </button>
              <button title="Play / Pause (Space / K)" onClick={togglePlayPause}>
                {playing ? '⏸' : '▶'}
              </button>
              <button title="Forward 10 seconds (L)" onClick={() => seekRelative(10)}>
                10 ⏩
              </button>

              <button title="Mute / Unmute (M)" onClick={() => setMuted((m) => !m)}>
                {muted ? '🔇' : '🔊'}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (v > 0) setMuted(false);
                }}
                className="volume-slider"
              />

              <div className="vp-pill">
                {formatTime(playedSeconds)} / {formatTime(duration)}
              </div>
            </div>

            <div className="vp-center">
              <div className="vp-pill">In this video</div>
              <button title="Subtitles / CC (placeholder)">CC</button>
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                title="Playback speed"
              >
                {playbackRates.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}x
                  </option>
                ))}
              </select>
            </div>

            <div className="vp-right">
              {onPrevEpisode && (
                <button title="Previous episode (P)" onClick={onPrevEpisode}>
                  ⏮
                </button>
              )}
              {onNextEpisode && (
                <button title="Next episode (N)" onClick={onNextEpisode}>
                  ⏭
                </button>
              )}
              <button title="Fullscreen (F)" onClick={toggleFullscreen}>
                {isFullscreen ? '🡼' : '⛶'}
              </button>
              {onClose && (
                <button title="Close" onClick={onClose}>
                  ✖
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
