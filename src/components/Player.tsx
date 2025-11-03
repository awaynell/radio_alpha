import {
  useState,
  useRef,
  useEffect,
  useCallback,
  MutableRefObject,
} from "react";
import { Vortex } from "react-loader-spinner";
import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";

import { STREAM_URL } from "@config/api";
import { polar } from "@config/visualizerModels/polar";

import { fetchStatusJson } from "@api/fetchPlayerInfo";

import { decodeHtmlEntities, fixEncoding } from "@utils/common";

import { useVisualizer } from "@hooks/useVisualizer";
import { useTitleAnimation } from "@hooks/useTitleAnimation";

import "./Player.css";
import Switch from "./Switch";
import PlainSwitch from "./PlainSwitch";
import {
  energyBars,
  spectrumWaves,
  adaptiveColors,
} from "@config/visualizerModels/visualizerModels";
import { DEFAULT_OPTIONS } from "@config/visualizerModels/DEFAULT";
import { useTrackVotes } from "@hooks/useTrackVotes";
import { TopSongsModal } from "./TopSongsModal";
import { HotkeysModal } from "./HotkeysModal";
import SettingsModal from "./SettingsModal";

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

  const getStoredAutoHide = (): boolean => {
    const stored = localStorage.getItem("radio-alpha-autohide");
    if (stored !== null) return stored === "true";
    return true;
  };

  const getStoredAnimModel = ():
    | "polar"
    | "dominantFrequency"
    | "energyBars"
    | "spectrumWaves"
    | "warpGrid" => {
    const stored = localStorage.getItem("radio-alpha-anim-model");
    if (
      stored &&
      [
        "polar",
        "dominantFrequency",
        "energyBars",
        "spectrumWaves",
        "warpGrid",
      ].includes(stored)
    ) {
      return stored as
        | "polar"
        | "dominantFrequency"
        | "energyBars"
        | "spectrumWaves"
        | "warpGrid";
    }
    return "polar"; // значение по умолчанию
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(getStoredVolume);
  const volumeRef = useRef(getStoredVolume()); // Ref для хранения текущего значения без ре-рендеров
  const saveTimeoutRef = useRef<number | null>(null); // Ref для throttle сохранения
  const prevVolumeRef = useRef<number | null>(null); // для восстановления после mute

  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSongTitle, setCurrentSongTitle] = useState("");
  const [listenersCount, setListenersCount] = useState(0);
  const [maxListenersCount, setMaxListenersCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [currentAnimModel, setCurrentAnimModel] = useState<
    "polar" | "dominantFrequency" | "energyBars" | "spectrumWaves" | "warpGrid"
  >(getStoredAnimModel);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusRetryable, setStatusRetryable] = useState(false);
  const isStatusRequestInProgressRef = useRef(false); // Ref для предотвращения параллельных запросов
  const statusIntervalRef = useRef<number | null>(null); // Ref для хранения ID интервала статуса

  // Кастомный dropdown для выбора типа визуализации
  const animOptions: Array<{
    value: "polar" | "energyBars" | "spectrumWaves" | "warpGrid";
    label: string;
  }> = [
    { value: "polar", label: "Полярная" },
    { value: "energyBars", label: "Энергетические бары" },
    { value: "spectrumWaves", label: "Спектральные волны" },
    { value: "warpGrid", label: "Космическая матрица" },
  ];
  const [isAnimMenuOpen, setIsAnimMenuOpen] = useState(false);
  const [highlightedAnimIndex, setHighlightedAnimIndex] = useState<number>(
    Math.max(
      0,
      animOptions.findIndex((o) => o.value === currentAnimModel)
    )
  );
  const animDropdownRef = useRef<HTMLDivElement | null>(null);
  const toggleAnimMenu = () => setIsAnimMenuOpen((prev) => !prev);
  const closeAnimMenu = () => setIsAnimMenuOpen(false);
  const selectAnimByIndex = (index: number) => {
    const option = animOptions[index];
    if (!option) return;
    setCurrentAnimModel(option.value);
    localStorage.setItem("radio-alpha-anim-model", option.value);
    setHighlightedAnimIndex(index);
    closeAnimMenu();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isAnimMenuOpen &&
        animDropdownRef.current &&
        !animDropdownRef.current.contains(e.target as Node)
      ) {
        closeAnimMenu();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAnimMenuOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeAnimMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAnimMenuOpen]);

  // Управление авто-скрытием меню
  const toggleAutoHide = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setCanHidden(next);
    localStorage.setItem("radio-alpha-autohide", String(next));
  };

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
  const [canHidden, setCanHidden] = useState(getStoredAutoHide);
  const [hidden, setHidden] = useState(false);
  const [isTopSongsModalOpen, setIsTopSongsModalOpen] = useState(false);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAudioVizVisible, setIsAudioVizVisible] = useState(
    getStoredAudioVizVisible
  );

  // Функции для открытия модалок с закрытием остальных
  const openTopSongsModal = useCallback(() => {
    setIsHotkeysOpen(false);
    setIsSettingsOpen(false);
    setIsTopSongsModalOpen(true);
  }, []);

  const openHotkeysModal = useCallback(() => {
    setIsTopSongsModalOpen(false);
    setIsSettingsOpen(false);
    setIsHotkeysOpen(true);
  }, []);

  const openSettingsModal = useCallback(() => {
    setIsTopSongsModalOpen(false);
    setIsHotkeysOpen(false);
    setIsSettingsOpen(true);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const [AudioVisualizer, init, analyserRef] = useVisualizer(
    audioRef as MutableRefObject<HTMLAudioElement>
  );

  useTitleAnimation(analyserRef, titleRef, isPlaying && isLive);

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

      // Немедленно обновляем громкость аудио элемента
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }

      // Обновляем UI немедленно
      setVolume(newVolume);
      if (volumeLabelRef.current) {
        volumeLabelRef.current.textContent = `${Math.round(newVolume * 100)}%`;
      }

      // Throttle только сохранение
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        localStorage.setItem("radio-alpha-volume", newVolume.toString());
        saveTimeoutRef.current = null;
      }, 200);
    },
    []
  );

  const getRadioStatus = useCallback(async () => {
    // Предотвращаем параллельные запросы
    if (isStatusRequestInProgressRef.current) {
      return;
    }

    isStatusRequestInProgressRef.current = true;
    setIsLoadingStatus(true);

    try {
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
          // Исправляем кодировку кириллицы перед декодированием HTML-сущностей
          const fixedTitle = fixEncoding(songTitle);
          setCurrentSongTitle(decodeHtmlEntities(fixedTitle));
        } else if (!songTitle) {
          // Если нет названия трека, но данные получены, оставляем предыдущее значение
          // или пустую строку, если это первый запрос
        }

        // Очищаем ошибку при успешном получении данных
        setApiStatusError(null);
        setStatusRetryable(false);
      }
    } catch (error) {
      console.error("Unexpected error in getRadioStatus:", error);
    } finally {
      setIsLoadingStatus(false);
      isStatusRequestInProgressRef.current = false;
    }
  }, []); // Пустой массив зависимостей, т.к. используем только setState функции

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Устанавливаем громкость только при монтировании

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Отдельный useEffect для интервала обновления статуса - создается только один раз
  useEffect(() => {
    // Первый запрос статуса при монтировании
    getRadioStatus();

    // Создаем интервал для регулярного обновления статуса (раз в 5 секунд)
    statusIntervalRef.current = window.setInterval(() => {
      // Используем только ref для проверки, чтобы не зависеть от состояния
      if (!isStatusRequestInProgressRef.current) {
        getRadioStatus();
      }
    }, 2500);

    return () => {
      if (statusIntervalRef.current !== null) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [getRadioStatus]); // getRadioStatus стабильна благодаря useCallback, поэтому интервал не пересоздается

  // Отдельный useEffect для другой логики (скрытие интерфейса, обработка ошибок)
  useEffect(() => {
    const handlePointerMove = () => {
      setHidden(false);
    };

    document.body.addEventListener("pointermove", handlePointerMove);

    const interval = setInterval(() => {
      if (isPlaying && canHidden) {
        setHidden(true);
      }

      if (hasError && !isRadioPlayingError) {
        togglePlay();
      }
    }, 5000);

    return () => {
      document.body.removeEventListener("pointermove", handlePointerMove);
      clearInterval(interval);
    };
  }, [hasError, isRadioPlayingError, togglePlay, isPlaying, canHidden]);

  useEffect(() => {
    if (!isLive) {
      setIsPlaying(false);
    }
  }, [isLive]);

  // Обработка горячих клавиш (layout-independent через event.code)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем нажатия, если фокус на input, textarea или других элементах ввода
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Предотвращаем стандартное поведение для управляющих клавиш
      const controlCodes = [
        "Space",
        "KeyP",
        "ArrowUp",
        "ArrowDown",
        "KeyM",
        "KeyV",
        "KeyT",
      ];
      if (controlCodes.includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case "Space": // Пробел - Play/Pause
        case "KeyP":
          if (!isLoading && isLive) {
            togglePlay();
          }
          break;

        case "ArrowUp": // Стрелка вверх - Увеличить громкость
          if (audioRef.current) {
            const newVolume = Math.min(1, volumeRef.current + 0.05);
            volumeRef.current = newVolume;
            audioRef.current.volume = newVolume;
            if (volumeLabelRef.current) {
              volumeLabelRef.current.textContent = `${Math.round(
                newVolume * 100
              )}%`;
            }
            setVolume(newVolume);
            localStorage.setItem("radio-alpha-volume", newVolume.toString());
          }
          break;

        case "ArrowDown": // Стрелка вниз - Уменьшить громкость
          if (audioRef.current) {
            const newVolume = Math.max(0, volumeRef.current - 0.05);
            volumeRef.current = newVolume;
            audioRef.current.volume = newVolume;
            if (volumeLabelRef.current) {
              volumeLabelRef.current.textContent = `${Math.round(
                newVolume * 100
              )}%`;
            }
            setVolume(newVolume);
            localStorage.setItem("radio-alpha-volume", newVolume.toString());
          }
          break;

        case "KeyM": // M - Mute/Unmute
          if (audioRef.current) {
            if (volumeRef.current > 0) {
              // Сохраняем текущую громкость перед выключением
              const savedVolume = volumeRef.current;
              audioRef.current.setAttribute(
                "data-saved-volume",
                savedVolume.toString()
              );
              volumeRef.current = 0;
              audioRef.current.volume = 0;
              if (volumeLabelRef.current) {
                volumeLabelRef.current.textContent = "0%";
              }
              setVolume(0);
            } else {
              // Восстанавливаем сохраненную громкость
              const savedVolume = parseFloat(
                audioRef.current.getAttribute("data-saved-volume") || "0.25"
              );
              volumeRef.current = savedVolume;
              audioRef.current.volume = savedVolume;
              if (volumeLabelRef.current) {
                volumeLabelRef.current.textContent = `${Math.round(
                  savedVolume * 100
                )}%`;
              }
              setVolume(savedVolume);
            }
          }
          break;

        case "KeyV": // V - Переключить визуализацию
          setIsAudioVizVisible((prev) => {
            const newValue = !prev;
            localStorage.setItem(
              "radio-alpha-audio-viz-visible",
              newValue.toString()
            );
            return newValue;
          });
          break;

        case "KeyT": // T - Открыть топ треков
          if (isTopSongsModalOpen) {
            setIsTopSongsModalOpen(false);
          } else {
            openTopSongsModal();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoading, isLive, togglePlay, isTopSongsModalOpen, openTopSongsModal]);

  return (
    <div
      className={"radio-player-container"}
      onMouseEnter={() => setHidden(false)}
    >
      <div
        className={clsx("radio-player", {
          "opacity-0 -zindex-1": hidden,
        })}
      >
        {/* Верхняя секция: Заголовок и информация о треке */}
        <div className="player-header">
          <h1
            ref={titleRef}
            className={clsx("player-title", {
              gradient: isLive,
              "audio-animated": isPlaying && isLive,
            })}
          >
            Radio Alpha
          </h1>

          {currentSongTitle && isLive && (
            <div className="song-info">
              <Tooltip.Provider delayDuration={200} skipDelayDuration={500}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <p
                      className="current-song"
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => {
                        e.currentTarget.classList.add("pressed");
                        window.setTimeout(() => {
                          e.currentTarget.classList.remove("pressed");
                        }, 150);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).click();
                        }
                      }}
                      onClick={async (e) => {
                        try {
                          await navigator.clipboard.writeText(currentSongTitle);
                          e.currentTarget.classList.add("copied");
                          window.setTimeout(() => {
                            e.currentTarget.classList.remove("copied");
                          }, 600);
                        } catch {
                          // no-op
                        }
                      }}
                    >
                      {currentSongTitle}
                    </p>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      align="center"
                      sideOffset={4}
                      className="tooltip-content"
                    >
                      Скопировать
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
              {userIP && isPlaying && (
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
            </div>
          )}
        </div>

        {/* Центральная секция: Основные элементы управления */}
        <div className="player-main-controls">
          <div className="radio-player-controls">
            <button
              className={clsx("play-toggle", {
                playing: isPlaying || isLive,
                loading: isLoading,
              })}
              onClick={togglePlay}
              disabled={isLoading || !isLive}
            >
              {isLoading ? (
                <Vortex
                  visible={true}
                  height="40"
                  width="40"
                  wrapperClass="button-loader"
                  colors={[
                    "#d90681",
                    "#E1693A",
                    "#E03A60",
                    "#E0A13A",
                    "#E04C3A",
                    "#d90681",
                  ]}
                />
              ) : (
                <>
                  {!isLive
                    ? "Радио сейчас выключено"
                    : isPlaying
                    ? "Выключить"
                    : "Включить"}
                </>
              )}
            </button>
          </div>

          {/* Панель настроек */}
          <div className="player-settings-panel">
            <div className="settings-card">
              <div className="settings-card-header">
                <span>Громкость</span>
                <p
                  ref={volumeLabelRef}
                  className="volume-label"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!audioRef.current) return;
                    if (volumeRef.current > 0) {
                      prevVolumeRef.current = volumeRef.current;
                      volumeRef.current = 0;
                      audioRef.current.volume = 0;
                      setVolume(0);
                      if (volumeLabelRef.current)
                        volumeLabelRef.current.textContent = "0%";
                    } else {
                      const restore = prevVolumeRef.current ?? 0.25;
                      volumeRef.current = restore;
                      audioRef.current.volume = restore;
                      setVolume(restore);
                      if (volumeLabelRef.current)
                        volumeLabelRef.current.textContent = `${Math.round(
                          restore * 100
                        )}%`;
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                >
                  {`${Math.round(volume * 100)}%`}
                </p>
              </div>
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
                style={{
                  background: `linear-gradient(90deg, #d90681 0%, #E1693A ${Math.round(
                    volume * 100
                  )}%, rgb(4, 4, 82) ${Math.round(
                    volume * 100
                  )}%, rgb(4, 4, 82) 100%)`,
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.05 : -0.05;
                  const next = Math.max(
                    0,
                    Math.min(1, volumeRef.current + delta)
                  );
                  volumeRef.current = next;
                  if (audioRef.current) audioRef.current.volume = next;
                  setVolume(next);
                  if (volumeLabelRef.current) {
                    volumeLabelRef.current.textContent = `${Math.round(
                      next * 100
                    )}%`;
                  }
                  if (saveTimeoutRef.current !== null) {
                    clearTimeout(saveTimeoutRef.current);
                  }
                  saveTimeoutRef.current = window.setTimeout(() => {
                    localStorage.setItem("radio-alpha-volume", next.toString());
                    saveTimeoutRef.current = null;
                  }, 200);
                }}
              />
              <div className="anim-control-row" style={{ marginTop: "12px" }}>
                <label className="switch-label" htmlFor="autohideSwitch">
                  Скрывать меню
                </label>
                <PlainSwitch
                  id="autohideSwitch"
                  checked={canHidden}
                  onChange={toggleAutoHide}
                />
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <span>Визуализация</span>
              </div>
              <div className="anim-controls">
                <div className="anim-control-row">
                  <label className="switch-label">Анимация</label>
                  <Switch
                    onChange={toggleAudioViz}
                    checked={isAudioVizVisible}
                  />
                </div>
                {isAudioVizVisible && (
                  <div className="anim-control-row">
                    <label className="select-label">Тип визуализации</label>
                    <div className="anim-dropdown" ref={animDropdownRef}>
                      <button
                        type="button"
                        className="anim-selectBtn"
                        aria-haspopup="listbox"
                        aria-expanded={isAnimMenuOpen}
                        onClick={toggleAnimMenu}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setIsAnimMenuOpen(true);
                            setHighlightedAnimIndex((i) =>
                              Math.min(animOptions.length - 1, i + 1)
                            );
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setIsAnimMenuOpen(true);
                            setHighlightedAnimIndex((i) => Math.max(0, i - 1));
                          } else if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isAnimMenuOpen) {
                              selectAnimByIndex(highlightedAnimIndex);
                            } else {
                              setIsAnimMenuOpen(true);
                            }
                          }
                        }}
                      >
                        {
                          animOptions.find((o) => o.value === currentAnimModel)
                            ?.label
                        }
                      </button>
                      {isAnimMenuOpen && (
                        <ul
                          className={clsx(
                            "anim-menu",
                            animOptions.length > 3 && "scrollable"
                          )}
                          role="listbox"
                        >
                          {animOptions.map((opt, idx) => {
                            const isSelected = opt.value === currentAnimModel;
                            const isHighlighted = idx === highlightedAnimIndex;
                            return (
                              <li
                                key={opt.value}
                                role="option"
                                aria-selected={isSelected}
                                className={clsx(
                                  "anim-item",
                                  isSelected && "selected",
                                  isHighlighted && "highlighted"
                                )}
                                onMouseEnter={() =>
                                  setHighlightedAnimIndex(idx)
                                }
                                onClick={() => selectAnimByIndex(idx)}
                              >
                                {opt.label}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Нижняя секция: Дополнительная информация и действия */}
        <div className="player-footer">
          {hasError && error && typeof error === "string" && (
            <div className="error-message">
              <p className="player-text player-error">{error}</p>
            </div>
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

          <div className="footer-actions">
            <button className="topSongsButton" onClick={openTopSongsModal}>
              Топ треков
            </button>

            {listenersCount ? (
              <div
                className={clsx("listeners-container", {
                  hidden: !listenersCount,
                })}
              >
                <div className="listener-item">
                  <span className="listener-label">Слушателей:</span>
                  <span className="listeners">{listenersCount}</span>
                </div>

                <div className="listener-item">
                  <span className="listener-label">Макс. на эфире:</span>
                  <span className="listeners">{maxListenersCount}</span>
                </div>
              </div>
            ) : null}
          </div>
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

      {isAudioVizVisible && (
        <div
          className="audio-viz"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <AudioVisualizer
            model={(() => {
              const storedColors = localStorage.getItem(
                "radio-alpha-viz-colors"
              );
              const colors = storedColors
                ? (JSON.parse(storedColors) as string[])
                : DEFAULT_OPTIONS.colors;
              const gamma = parseFloat(
                localStorage.getItem("radio-alpha-viz-gamma") || "1.7"
              );
              const percentile = parseFloat(
                localStorage.getItem("radio-alpha-viz-percentile") || "0.75"
              );
              if (currentAnimModel === "polar") {
                return polar({ colors, scale: 2, gamma, percentile });
              }
              if (currentAnimModel === "energyBars") {
                return energyBars({ colors, gamma, percentile });
              }
              if (currentAnimModel === "warpGrid") {
                return adaptiveColors({ colors, gamma, percentile });
              }
              return spectrumWaves({ colors, speed: 0.8, gamma, percentile });
            })()}
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

      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 1000001,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          className={clsx("helpQuestionBtn", {
            "opacity-0 -zindex-1": hidden,
          })}
          aria-label="Справка по горячим клавишам"
          onClick={openHotkeysModal}
          style={{ position: "relative", right: 0, marginLeft: 8 }}
        >
          ?
        </button>
        <button
          className={clsx("helpQuestionBtn", {
            "opacity-0 -zindex-1": hidden,
          })}
          aria-label="Настройки визуализации"
          onClick={openSettingsModal}
          style={{ position: "relative", right: 0, marginLeft: 8 }}
        >
          ⚙
        </button>
      </div>

      <HotkeysModal
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Player;
