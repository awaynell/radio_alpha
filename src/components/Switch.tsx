import { FC } from "react";
import styles from "./Switch.module.css";

type Props = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const Switch: FC<Props> = ({ onChange }) => {
  return (
    <div className={styles.switchCheck}>
      <input defaultChecked id="check-5" type="checkbox" onChange={onChange} />
      <label htmlFor="check-5" />
    </div>
  );
};

export default Switch;
