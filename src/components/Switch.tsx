import { FC } from "react";
import styles from "./Switch.module.css";

type Props = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checked?: boolean;
};

const Switch: FC<Props> = ({ onChange, checked }) => {
  return (
    <div className={styles.switchCheck}>
      <input
        id="check-5"
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <label htmlFor="check-5" />
    </div>
  );
};

export default Switch;
