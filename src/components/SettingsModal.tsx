import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./HotkeysModal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type PaletteKey =
  | "default"
  | "rainbow"
  | "fire"
  | "ocean"
  | "mono"
  | "sunset"
  | "forest"
  | "ice"
  | "cyberpunk"
  | "pastel"
  | "matrix";

const PALETTES: Record<PaletteKey, string[]> = {
  default: [
    "#FF0055",
    "#FF5500",
    "#FFCC00",
    "#33FF99",
    "#00FFFF",
    "#3366FF",
    "#9933FF",
    "#FF66CC",
  ],
  rainbow: [
    "#ff0000",
    "#ff7f00",
    "#ffff00",
    "#7fff00",
    "#00ff7f",
    "#00ffff",
    "#007fff",
    "#8b00ff",
  ],
  fire: [
    "#2b0000",
    "#5a0e00",
    "#7a1c00",
    "#c43a00",
    "#ff6a00",
    "#ffa300",
    "#ffd200",
  ],
  ocean: [
    "#0077b6",
    "#0096c7",
    "#00b4d8",
    "#48cae4",
    "#90e0ef",
    "#ade8f4",
    "#caf0f8",
  ],
  mono: [
    "#666666",
    "#7a7a7a",
    "#8f8f8f",
    "#a5a5a5",
    "#bbbbbb",
    "#d2d2d2",
    "#e6e6e6",
    "#ffffff",
  ],
  sunset: [
    "#120c3c",
    "#3d1e6d",
    "#6d2e85",
    "#a23e8f",
    "#d24f6b",
    "#ff7043",
    "#ff9e43",
    "#ffd166",
  ],
  forest: [
    "#0b3d20",
    "#14532d",
    "#1f6f3b",
    "#2e8b57",
    "#3fae72",
    "#66c28d",
    "#93d5ae",
    "#c7e9c0",
  ],
  ice: [
    "#001219",
    "#004e64",
    "#0a9396",
    "#94d2bd",
    "#e9d8a6",
    "#ee9b00",
    "#ca6702",
    "#bb3e03",
  ],
  cyberpunk: [
    "#0a0014",
    "#16002b",
    "#2a003d",
    "#ff007f",
    "#ff00ff",
    "#00f0ff",
    "#00ffa3",
    "#faff00",
  ],
  pastel: [
    "#ffd6e8",
    "#ffe6f2",
    "#e2f0ff",
    "#d7fff1",
    "#fff6d6",
    "#ffe8cc",
    "#e6e6ff",
    "#f2ffe6",
  ],
  matrix: [
    "#001a00",
    "#002600",
    "#003300",
    "#004d00",
    "#007a00",
    "#00a300",
    "#00d400",
    "#7aff7a",
  ],
};

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [palette, setPalette] = useState<PaletteKey>(() => {
    const v = localStorage.getItem("radio-alpha-viz-palette");
    if (
      v &&
      [
        "default",
        "rainbow",
        "fire",
        "ocean",
        "mono",
        "sunset",
        "forest",
        "ice",
        "cyberpunk",
        "pastel",
        "matrix",
      ].includes(v)
    ) {
      return v as PaletteKey;
    }
    return "default";
  });

  const [gamma, setGamma] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem("radio-alpha-viz-gamma") || "1");
    return isNaN(v) ? 1 : Math.max(0.3, Math.min(3, v));
  });

  const [percentile, setPercentile] = useState<number>(() => {
    const v = parseFloat(
      localStorage.getItem("radio-alpha-viz-percentile") || "0.75"
    );
    if (isNaN(v)) return 0.75;
    return Math.max(0.5, Math.min(0.99, v));
  });

  const isPaletteKey = (k: string): k is PaletteKey =>
    k === "default" ||
    k === "rainbow" ||
    k === "fire" ||
    k === "ocean" ||
    k === "mono" ||
    k === "sunset" ||
    k === "forest" ||
    k === "ice" ||
    k === "cyberpunk" ||
    k === "pastel" ||
    k === "matrix";

  // Кастомный селект как в выборе анимаций
  const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const paletteDropdownRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextOverlayClickRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isPaletteMenuOpen &&
        paletteDropdownRef.current &&
        !paletteDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPaletteMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPaletteMenuOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setIsPaletteMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPaletteMenuOpen]);

  const selectPaletteByIndex = (index: number) => {
    const option = paletteOptions[index];
    if (!option) return;
    const next = option.key as PaletteKey;
    setPalette(next);
    localStorage.setItem("radio-alpha-viz-palette", next);
    localStorage.setItem(
      "radio-alpha-viz-colors",
      JSON.stringify(PALETTES[next])
    );
    setHighlightedIndex(index);
    setIsPaletteMenuOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    // при открытии перечитываем сохраненные значения
    const p = localStorage.getItem("radio-alpha-viz-palette");
    if (p && isPaletteKey(p)) setPalette(p);
    const g = parseFloat(localStorage.getItem("radio-alpha-viz-gamma") || "1");
    if (!isNaN(g)) setGamma(Math.max(0.3, Math.min(3, g)));
    const perc = parseFloat(
      localStorage.getItem("radio-alpha-viz-percentile") || "0.75"
    );
    if (!isNaN(perc)) setPercentile(Math.max(0.5, Math.min(0.99, perc)));
  }, [isOpen]);

  const paletteOptions = useMemo(
    () => [
      { key: "default", label: "Неон (по умолчанию)" },
      { key: "rainbow", label: "Радуга" },
      { key: "fire", label: "Огонь" },
      { key: "ocean", label: "Океан" },
      { key: "mono", label: "Монохром" },
      { key: "sunset", label: "Закат" },
      { key: "forest", label: "Лес" },
      { key: "ice", label: "Лёд" },
      { key: "cyberpunk", label: "Киберпанк" },
      { key: "pastel", label: "Пастель" },
      { key: "matrix", label: "Матрица" },
    ],
    []
  );

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        // Если открыт дропдаун палитры, по клику по оверлею закрываем только его
        if (isPaletteMenuOpen) {
          e.preventDefault();
          e.stopPropagation();
          ignoreNextOverlayClickRef.current = true;
          setIsPaletteMenuOpen(false);
        }
      }}
      onClick={(e) => {
        // Если только что закрыли меню — игнорируем этот click
        if (ignoreNextOverlayClickRef.current) {
          e.preventDefault();
          e.stopPropagation();
          ignoreNextOverlayClickRef.current = false;
          return;
        }
        onClose();
      }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Настройки визуализации</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Палитра</span>
            <div
              className="anim-dropdown"
              ref={paletteDropdownRef}
              style={{ width: "100%", maxWidth: "100%" }}
            >
              <button
                type="button"
                className="anim-selectBtn"
                aria-haspopup="listbox"
                aria-expanded={isPaletteMenuOpen}
                style={{ width: "100%", display: "block" }}
                onClick={() => setIsPaletteMenuOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsPaletteMenuOpen(true);
                    setHighlightedIndex((i) =>
                      Math.min(paletteOptions.length - 1, i + 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIsPaletteMenuOpen(true);
                    setHighlightedIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isPaletteMenuOpen) {
                      selectPaletteByIndex(highlightedIndex);
                    } else {
                      setIsPaletteMenuOpen(true);
                    }
                  }
                }}
              >
                {paletteOptions.find((o) => o.key === palette)?.label}
              </button>
              {isPaletteMenuOpen && (
                <ul
                  className="anim-menu palette"
                  role="listbox"
                  style={{ width: "100%" }}
                >
                  {paletteOptions.map((opt, idx) => {
                    const isSelected = opt.key === palette;
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <li
                        key={opt.key}
                        role="option"
                        aria-selected={isSelected}
                        className={`anim-item${isSelected ? " selected" : ""}${
                          isHighlighted ? " highlighted" : ""
                        }`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectPaletteByIndex(idx);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectPaletteByIndex(idx);
                        }}
                      >
                        {opt.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {PALETTES[palette].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: c,
                  }}
                />
              ))}
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>Гамма (нелинейность цвета): {gamma.toFixed(2)}</span>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={gamma}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setGamma(v);
                localStorage.setItem("radio-alpha-viz-gamma", String(v));
              }}
              className="styled-slider neutral"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) " +
                  Math.round(((gamma - 0.3) / (3 - 0.3)) * 100) +
                  "%, rgba(255,255,255,0.12) " +
                  Math.round(((gamma - 0.3) / (3 - 0.3)) * 100) +
                  "%, rgba(255,255,255,0.12) 100%)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>
              Перцентиль нормализации: {(percentile * 100).toFixed(0)}%
            </span>
            <input
              type="range"
              min={0.5}
              max={0.99}
              step={0.01}
              value={percentile}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setPercentile(v);
                localStorage.setItem("radio-alpha-viz-percentile", String(v));
              }}
              className="styled-slider neutral"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) " +
                  Math.round(((percentile - 0.5) / (0.99 - 0.5)) * 100) +
                  "%, rgba(255,255,255,0.12) " +
                  Math.round(((percentile - 0.5) / (0.99 - 0.5)) * 100) +
                  "%, rgba(255,255,255,0.12) 100%)",
              }}
            />
            <span style={{ color: "#aaa", fontSize: 12 }}>
              Выше перцентиль → реже «пересвет» верхним цветом
            </span>
          </label>
        </div>

        <button className={styles.closeButton} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
