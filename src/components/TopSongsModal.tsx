import React from "react";
import { useGetTopSongs } from "@/hooks/useGetTopSongs";
import styles from "./TopSongsModal.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const TopSongsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { topAllTime, topToday, isLoading } = useGetTopSongs();
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!copiedText) return;
    const timer = window.setTimeout(() => setCopiedText(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copiedText]);

  if (!isOpen) return null;

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedText(`Скопировано: ${text}`);
    } catch (e) {
      setCopiedText("Не удалось скопировать");
    }
  };

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
            <li
              key={`${item.track}-${index}`}
              className={styles.listItem}
              onClick={() => handleCopy(item.track)}
              title="Скопировать название трека"
            >
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

        {copiedText && (
          <div className={styles.toast} aria-live="polite">
            {copiedText}
          </div>
        )}

        <button className={styles.closeButton} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
};
