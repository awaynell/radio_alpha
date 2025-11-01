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

import { decodeHtmlEntities } from "@utils/common";

import { useVisualizer } from "@hooks/useVisualizer";

import "./Player.css";
import Switch from "./Switch";
import {
  energyBars,
  spectrumWaves,
} from "@config/visualizerModels/visualizerModels";
import { DEFAULT_OPTIONS } from "@config/visualizerModels/DEFAULT";
import { useTrackVotes } from "@hooks/useTrackVotes";
import { TopSongsModal } from "./TopSongsModal";

const Player = () => {
  // Загрузка значений из localStorage при инициализации
  const getStoredVolume = (): number => {
    const stored = localStorage.getItem("radio-alpha-volume");
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
    return 0.25; // значение по умолчанию
  };

  const getStoredAudioVizVisible = (): boolean => {
    const stored = localStorage.getItem("radio-alpha-audio-viz-visible");
    if (stored !== null) {
      return stored === "true";
    }
    return true; // значение по умолчанию
  };

  const getStoredAnimModel = ():
    | "polar"
    | "dominantFrequency"
    | "energyBars"
    | "spectrumWaves" => {
    const stored = localStorage.getItem("radio-alpha-anim-model");
    if (
      stored &&
      ["polar", "dominantFrequency", "energyBars", "spectrumWaves"].includes(
        stored
      )
    ) {
      return stored as
        | "polar"
        | "dominantFrequency"
        | "energyBars"
        | "spectrumWaves";
    }
    return "polar"; // значение по умолчанию
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(getStoredVolume);
  const volumeRef = useRef(getStoredVolume()); // Ref для хранения текущего значения без ре-рендеров
  const saveTimeoutRef = useRef<number | null>(null); // Ref для throttle сохранения
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState("");
  const [listenersCount, setListenersCount] = useState(0);
  const [maxListenersCount, setMaxListenersCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [currentAnimModel, setCurrentAnimModel] = useState<
    "polar" | "dominantFrequency" | "energyBars" | "spectrumWaves"
  >(getStoredAnimModel);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusRetryable, setStatusRetryable] = useState(false);

  const {
    vote,
    isLoading: isVoting,
    likes,
    dislikes,
    alreadyVoted,
    userIP,
  } = useTrackVotes(currentSongTitle);

  // const [audioVizColor, setAudioVizColor] = useState("#FFFFFF");
  const [error, setError] = useState<string | null>(null);
  const [canHidden, setCanHidden] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [isTopSongsModalOpen, setIsTopSongsModalOpen] = useState(false);
  const [isAudioVizVisible, setIsAudioVizVisible] = useState(
    getStoredAudioVizVisible
  );

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

  // Ref для DOM элемента label громкости
  const volumeLabelRef = useRef<HTMLParagraphElement | null>(null);

  // Обработчик изменения громкости - вызывается при каждом движении ползунка
  // Оптимизирован для минимального количества ре-рендеров
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHidden(false);

      const newVolume = parseFloat(e.target.value);
      volumeRef.current = newVolume;

      // Немедленно обновляем громкость аудио элемента (синхронно, но не блокирует рендер)
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }

      // Обновляем label напрямую через DOM, чтобы избежать ре-рендеров React
      if (volumeLabelRef.current) {
        volumeLabelRef.current.textContent = `${Math.round(newVolume * 100)}%`;
      }

      // Очищаем предыдущий таймер сохранения
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Обновляем состояние и localStorage с задержкой (throttle)
      // Это предотвращает множественные ре-рендеры при быстром движении ползунка
      saveTimeoutRef.current = window.setTimeout(() => {
        setVolume(newVolume);
        localStorage.setItem("radio-alpha-volume", newVolume.toString());
        saveTimeoutRef.current = null;
      }, 200);
    },
    []
  );

  const getRadioStatus = async () => {
    setIsLoadingStatus(true);

    // Не очищаем ошибку сразу, чтобы пользователь видел предыдущую ошибку
    // пока идет новый запрос

    const result = await fetchStatusJson();

    if (result.error) {
      setApiStatusError(result.error);
      setStatusRetryable(result.isRetryable);

      // Fallback: сохраняем предыдущие значения при ошибке API
      // Это позволяет интерфейсу продолжать работать даже при временных сбоях
      // Значения обновятся при следующем успешном запросе
    } else if (result.data) {
      const radioStatus = result.data;
      const songTitle = radioStatus?.icestats?.source?.title;
      const listenersCount = radioStatus?.icestats?.source?.listeners;
      const maxListenersCount = radioStatus?.icestats?.source?.listener_peak;

      // Обновляем значения только если они получены
      // Используем fallback к 0 для числовых значений
      setListenersCount(listenersCount ?? 0);
      setMaxListenersCount(maxListenersCount ?? 0);
      setIsLive(radioStatus?.icestats?.source !== undefined);

      if (songTitle && songTitle.length !== 0) {
        setCurrentSongTitle(decodeHtmlEntities(songTitle));
      } else if (!songTitle) {
        // Если нет названия трека, но данные получены, оставляем предыдущее значение
        // или пустую строку, если это первый запрос
      }

      // Очищаем ошибку при успешном получении данных
      setApiStatusError(null);
      setStatusRetryable(false);
    }

    setIsLoadingStatus(false);
  };

  const toggleAudioViz = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setIsAudioVizVisible(newValue);
    // Сохранение в localStorage
    localStorage.setItem("radio-alpha-audio-viz-visible", newValue.toString());
  };

  // Установка начальной громкости из localStorage при инициализации audio элемента
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (volumeLabelRef.current) {
      volumeLabelRef.current.textContent = `${Math.round(volume * 100)}%`;
    }
  }, []); // Устанавливаем громкость только при монтировании

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.body.addEventListener("pointermove", () => {
      setHidden(false);
    });

    getRadioStatus();

    const interval = setInterval(() => {
      if (isPlaying && canHidden) {
        setHidden(true);
      }

      if (hasError && !isRadioPlayingError) {
        togglePlay();
      }

      // Обновляем статус, даже если была ошибка API
      // Для retryable ошибок продолжаем попытки с обычной частотой
      // Для non-retryable ошибок все равно обновляем, но пользователь увидит ошибку
      if (!isLoadingStatus) {
        // Пропускаем обновление только если ошибка non-retryable и прошло мало времени
        // (но все равно обновим через некоторое время)
        getRadioStatus();
      }
    }, 5000);

    return () => {
      document.body.addEventListener("pointermove", () => {
        setHidden(false);
      });

      clearInterval(interval);
    };
  }, [hasError, isRadioPlayingError, togglePlay, isPlaying, canHidden]);

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
      <div className={clsx("radio-player", { "opacity-0 -zindex-1": hidden })}>
        <div className="anim-controls">
          <Switch onChange={toggleAudioViz} checked={isAudioVizVisible} />

          {isAudioVizVisible && (
            <select
              onChange={(e) => {
                const newModel = e.target.value as
                  | "polar"
                  | "energyBars"
                  | "spectrumWaves";
                setCurrentAnimModel(newModel);
                // Сохранение в localStorage
                localStorage.setItem("radio-alpha-anim-model", newModel);
              }}
              value={currentAnimModel}
              className="anim-select"
            >
              <option value="polar">Полярная</option>
              <option value="energyBars">Энергетические бары</option>
              <option value="spectrumWaves">Спектральные волны</option>
            </select>
          )}
        </div>

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

        {currentSongTitle && isLive && userIP && (
          <div className="vote-block">
            <button
              className="vote-btn like-btn"
              onClick={() => vote(1)}
              disabled={alreadyVoted || isVoting}
            >
              👍 {likes}
            </button>
            <button
              className="vote-btn dislike-btn"
              onClick={() => vote(-1)}
              disabled={alreadyVoted || isVoting}
            >
              👎 {dislikes}
            </button>
          </div>
        )}

        <button
          className="topSongsButton"
          onClick={() => setIsTopSongsModalOpen(true)}
        >
          Топ треков
        </button>

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

        {apiStatusError && (
          <div className="api-status-error">
            <p className="player-text player-error">{apiStatusError}</p>
            {statusRetryable && (
              <button
                className="retry-button"
                onClick={() => {
                  setApiStatusError(null);
                  getRadioStatus();
                }}
                disabled={isLoadingStatus}
              >
                {isLoadingStatus ? "Обновление..." : "Повторить попытку"}
              </button>
            )}
          </div>
        )}

        <div className="volume-slider">
          <p>Громкость</p>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            defaultValue={volume}
            onChange={handleVolumeChange}
            className={clsx("styled-slider", {
              gradient: isLive,
            })}
          />

          <p ref={volumeLabelRef} className="volume-label">
            {`${Math.round(volume * 100)}%`}
          </p>
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
                ? polar({
                    darkMode: true,
                    scale: 2,
                    colors: DEFAULT_OPTIONS.colors,
                  })
                : currentAnimModel === "energyBars"
                ? energyBars({ colors: DEFAULT_OPTIONS.colors })
                : spectrumWaves({ colors: DEFAULT_OPTIONS.colors, speed: 0.8 })
            }
            modelType={currentAnimModel}
          />
        </div>
      )}
      <div
        style={{ position: "fixed", bottom: 10, right: 0, zIndex: "999999999" }}
      >
        <TopSongsModal
          isOpen={isTopSongsModalOpen}
          onClose={() => setIsTopSongsModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default Player;
