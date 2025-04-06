import {
  useState,
  useRef,
  useEffect,
  useCallback,
  MutableRefObject,
} from "react";
import { Vortex } from "react-loader-spinner";
import clsx from "clsx";

import { STREAM_URL } from "@config/api";
import { polar } from "@config/visualizerModels/polar";

import { fetchStatusJson } from "@api/fetchPlayerInfo";

import { encodeString } from "@utils/common";

import { useVisualizer } from "@hooks/useVisualizer";

import "./Player.css";
import Switch from "./Switch";
import {
  energyBars,
  spectrumWaves,
  pulseCircles,
} from "@config/visualizerModels/visualizerModels";

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState("");
  const [listenersCount, setListenersCount] = useState(0);
  const [maxListenersCount, setMaxListenersCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [currentAnimModel, setCurrentAnimModel] = useState<
    | "polar"
    | "dominantFrequency"
    | "energyBars"
    | "spectrumWaves"
    | "pulseCircles"
  >("polar");

  // const [audioVizColor, setAudioVizColor] = useState("#FFFFFF");
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [isAudioVizVisible, setIsAudioVizVisible] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [AudioVisualizer, init] = useVisualizer(
    audioRef as MutableRefObject<HTMLAudioElement>
  );

  const isRadioPlayingError = error?.includes("no supported source was found");

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
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
          setIsPlaying(true);
        })
        .catch((err) => {
          setIsLoading(false);
          setHasError(true);
          setError(err.message);
          setIsPlaying(false);
        });
    }
  }, [isPlaying]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHidden(false);

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const getRadioStatus = async () => {
    const radioStatus = await fetchStatusJson();

    const songTitle = radioStatus?.icestats?.source?.title;

    const listenersCount = radioStatus?.icestats?.source?.listeners;

    const maxListenersCount = radioStatus?.icestats?.source?.listener_peak;

    setListenersCount(listenersCount || 0);

    setMaxListenersCount(maxListenersCount || 0);

    setIsLive(radioStatus?.icestats?.source !== undefined);

    if (songTitle && songTitle.length !== 0) {
      const encodedSongTitle = encodeString(songTitle);

      setCurrentSongTitle(encodedSongTitle);
    }
  };

  const toggleAudioViz = (e) => {
    setIsAudioVizVisible(e.target.checked);
  };

  useEffect(() => {
    document.body.addEventListener("pointermove", () => {
      setHidden(false);
    });

    getRadioStatus();

    const interval = setInterval(() => {
      if (isPlaying) {
        setHidden(true);
      }

      if (hasError && !isRadioPlayingError) {
        togglePlay();
      }

      if (!hasError) {
        getRadioStatus();
      }
    }, 5000);

    return () => {
      document.body.addEventListener("pointermove", () => {
        setHidden(false);
      });

      clearInterval(interval);
    };
  }, [hasError, isRadioPlayingError, togglePlay, isPlaying]);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (isPlaying) {
  //       setAudioVizColor((prevColor) => {
  //         const nextColor = generateNextColor(prevColor);
  //         return nextColor;
  //       });
  //     }
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, [audioVizColor, isPlaying]);

  useEffect(() => {
    if (!isLive) {
      setIsPlaying(false);
    }
  }, [isLive]);

  return (
    <div
      className={"radio-player-container"}
      onMouseEnter={() => setHidden(false)}
    >
      <div className={clsx("radio-player", { "opacity-0": hidden })}>
        <div>
          <Switch onChange={toggleAudioViz} />
        </div>

        {isAudioVizVisible && (
          <select
            onChange={(e) =>
              setCurrentAnimModel(
                e.target.value as
                  | "polar"
                  | "energyBars"
                  | "spectrumWaves"
                  | "pulseCircles"
              )
            }
            value={currentAnimModel}
            className="anim-select"
          >
            <option value="polar">Полярная</option>
            <option value="energyBars">Энергетические бары</option>
            <option value="spectrumWaves">Спектральные волны</option>
            <option value="pulseCircles">Пульсирующие круги</option>
          </select>
        )}

        <h1
          className={clsx("player-title", {
            gradient: isLive,
          })}
        >
          Radio Alpha
        </h1>

        {currentSongTitle && isLive && (
          <p className="current-song">{currentSongTitle}</p>
        )}

        <div className="radio-player-controls">
          <button
            className={clsx("play-toggle", {
              playing: isPlaying || isLive,
              hidden: isLoading,
            })}
            onClick={togglePlay}
            disabled={isLoading || !isLive}
          >
            {!isLive
              ? "Радио сейчас выключено"
              : isPlaying
              ? "Выключить"
              : "Включить"}
          </button>

          <Vortex
            visible={true}
            height="90"
            width="90"
            wrapperClass={clsx("loader", {
              hidden: !isLoading,
            })}
            colors={[
              "#d90681",
              "#E1693A",
              "#E03A60",
              "#E0A13A",
              "#E04C3A",
              "#d90681",
            ]}
          />
        </div>

        {hasError && error && typeof error === "string" && (
          <p className="player-text player-error">{error}</p>
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
            className={clsx("styled-slider", {
              gradient: isLive,
            })}
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

        <div
          className={clsx("listeners-container", {
            hidden: !listenersCount,
          })}
        >
          <div className="listener-container">
            <p>Слушателей:</p>
            <p className="listeners">{listenersCount}</p>
          </div>

          <div className="listener-container">
            <p>Макс. слушателей на текущем эфире:</p>
            <p className="listeners">{maxListenersCount}</p>
          </div>
        </div>
      </div>

      {isAudioVizVisible && (
        <div className="audio-viz">
          <AudioVisualizer
            //@ts-ignore
            model={
              currentAnimModel === "polar"
                ? polar({ darkMode: true, scale: 2 })
                : currentAnimModel === "energyBars"
                ? energyBars({ colors: ["#FF6B6B", "#4ECDC4", "#FFD60A"] })
                : currentAnimModel === "spectrumWaves"
                ? spectrumWaves({ speed: 0.8 })
                : pulseCircles({ colors: ["#9B59B6", "#3498DB"], scale: 1.5 })
            }
            modelType={currentAnimModel}
          />
        </div>
      )}
    </div>
  );
};

export default Player;
