import { useState, useRef, useEffect, useCallback } from "react";
import "./Player.css";
import { fetchCurrentSongTitle } from "../api/fetchPlayerInfo";
import { STREAM_URL } from "../config/api";

import { useVisualizer, models } from "react-audio-viz";
import { generateGoodHexColor } from "../utils/common";

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState("");
  const [audioVizColor, setAudioVizColor] = useState("#282828");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [AudioViz, init] = useVisualizer(audioRef);

  const isRadioPlaying = error?.includes("no supported source was found");

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
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const getCurrentSongTitle = async () => {
    fetchCurrentSongTitle((songTitle) => {
      setCurrentSongTitle(songTitle);
    });
  };

  useEffect(() => {
    getCurrentSongTitle();
    setAudioVizColor(generateGoodHexColor());

    const interval = setInterval(() => {
      if (hasError && isRadioPlaying) {
        togglePlay();
      }

      if (!hasError) {
        getCurrentSongTitle();

        setAudioVizColor(generateGoodHexColor());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasError, isRadioPlaying, togglePlay]);

  return (
    <>
      <div className="radio-player">
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
            {!isRadioPlaying ? "Сейчас радио выключено!" : error}
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
            preload="nonex"
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
            scale: 1,
            binSize: 25,
          })}
        />
      </div>
    </>
  );
};

export default Player;
