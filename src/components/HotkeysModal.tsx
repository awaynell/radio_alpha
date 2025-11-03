import React from "react";
import styles from "./HotkeysModal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const HotkeysModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Горячие клавиши</h2>
        <ul className={styles.list}>
          <li className={styles.item}>
            <span className={styles.kbd}>Space</span>
            <span className={styles.or}>или</span>
            <span className={styles.kbd}>P</span>
            <span className={styles.desc}>Воспроизведение / Пауза</span>
          </li>
          <li className={styles.item}>
            <span className={styles.kbd}>Arrow Up</span>
            <span className={styles.desc}>Громкость +</span>
          </li>
          <li className={styles.item}>
            <span className={styles.kbd}>Arrow Down</span>
            <span className={styles.desc}>Громкость −</span>
          </li>
          <li className={styles.item}>
            <span className={styles.kbd}>M</span>
            <span className={styles.desc}>Быстрый Mute / Unmute</span>
          </li>
          <li className={styles.item}>
            <span className={styles.kbd}>V</span>
            <span className={styles.desc}>Показать/скрыть визуализацию</span>
          </li>
          <li className={styles.item}>
            <span className={styles.kbd}>T</span>
            <span className={styles.desc}>Открыть топ треков</span>
          </li>
        </ul>
        <button className={styles.closeButton} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
};
