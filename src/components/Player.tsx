import { useState, useRef, useEffect, useCallback } from "react";
import "./Player.css";
import { fetchCurrentSongTitle } from "../api/fetchPlayerInfo";
import { STREAM_URL } from "../config/api";

import { useVisualizer, models } from "react-audio-viz";
import { encodeString, generateNextColor } from "../utils/common";

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState("");

  const [audioVizColor, setAudioVizColor] = useState("#FFFFFF");
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [AudioViz, init] = useVisualizer(audioRef);

  const isRadioPlayingError = error?.includes("no supported source was found");

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setHasError(false);

      audioRef.current.load();

      audioRef.current.crossOrigin = "anonymous";

      audioRef.current
        .play()
        .then(() => {
          setIsLoading(false);
          setHasError(false);
          setError(null);
        })
        .catch((err) => {
          setIsLoading(false);
          setHasError(true);
          setError(err.message);
          setIsPlaying(false);
        });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHidden(false);

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const getCurrentSongTitle = async () => {
    fetchCurrentSongTitle((songTitle) => {
      if (songTitle && songTitle.length !== 0) {
        const encodedSongTitle = encodeString(songTitle);

        setCurrentSongTitle(encodedSongTitle);
      }
    });
  };

  useEffect(() => {
    document.body.addEventListener("pointermove", () => {
      setHidden(false);
    });

    getCurrentSongTitle();

    const interval = setInterval(() => {
      if (isPlaying) {
        setHidden(true);
      }

      if (hasError && !isRadioPlayingError) {
        togglePlay();
      }

      if (!hasError) {
        getCurrentSongTitle();
      }
    }, 5000);

    return () => {
      document.body.addEventListener("pointermove", () => {
        setHidden(false);
      });

      clearInterval(interval);
    };
  }, [hasError, isRadioPlayingError, togglePlay, isPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setAudioVizColor((prevColor) => {
          const nextColor = generateNextColor(prevColor);
          return nextColor;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [audioVizColor, isPlaying]);

  return (
    <>
      <div
        className={`radio-player ${hidden ? "opacity-0" : ""}`}
        onMouseEnter={() => setHidden(false)}
      >
        <h1 className="player-title">Radio Alpha</h1>

        {currentSongTitle && <p className="current-song">{currentSongTitle}</p>}

        <button
          className={`play-toggle ${isPlaying ? "playing" : ""}`}
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isPlaying ? "Выключить" : "Включить"}
        </button>

        {isLoading && <p className="player-text player-status">Загрузка...</p>}

        {hasError && error && typeof error === "string" && (
          <p className="player-text player-error">
            {isRadioPlayingError ? "Сейчас радио выключено!" : error}
          </p>
        )}

        <div className="volume-slider">
          <p>Громкость</p>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="styled-slider"
          />

          <p className="volume-label">{`${Math.round(volume * 100)}%`}</p>
        </div>
        <div className="audio-container">
          <audio
            ref={audioRef}
            src={STREAM_URL}
            preload="none"
            onPlay={init}
            onError={() => {
              setHasError(true);
            }}
          />
        </div>
      </div>

      <div className="audio-viz">
        <AudioViz
          model={models.polar({
            darkMode: true,
            color: audioVizColor,
            scale: 2,
            binSize: 15,
          })}
        />
      </div>
    </>
  );
};

export default Player;
