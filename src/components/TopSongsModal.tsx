import React from "react";
import { useGetTopSongs } from "@/hooks/useGetTopSongs";
import styles from "./TopSongsModal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const TopSongsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { topAllTime, topToday, isLoading } = useGetTopSongs();

  if (!isOpen) return null;

  const renderList = (
    title: string,
    list: { track: string; likes: number }[]
  ) => (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {list.length === 0 ? (
        <p className={styles.empty}>Нет данных</p>
      ) : (
        <ul className={styles.list}>
          {list.map((item, index) => (
            <li key={`${item.track}-${index}`} className={styles.listItem}>
              <span>
                {index + 1}. {item.track}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>{item.likes} 👍</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Топ треков</h2>

        {isLoading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : (
          <div className={styles.content}>
            {renderList("🔥 За эфир", topToday)}
            {renderList(
              "🏆 За всё время",
              topAllTime.filter((item) => item.likes > 2)
            )}
          </div>
        )}

        <button className={styles.closeButton} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
};
