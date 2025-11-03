import { FC, useId } from "react";
import styles from "./PlainSwitch.module.css";

type Props = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checked?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  size?: number; // px, управляет --size
  className?: string;
};

export const PlainSwitch: FC<Props> = ({
  onChange,
  checked,
  disabled,
  id,
  ariaLabel,
  size,
  className,
}) => {
  const autoId = useId();
  const inputId = id ?? `plain-switch-${autoId}`;
  return (
    <div
      className={`${styles.switch}${className ? ` ${className}` : ""}`}
      style={
        size ? ({ ["--size"]: `${size}px` } as React.CSSProperties) : undefined
      }
    >
      <input
        id={inputId}
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        role="switch"
        aria-checked={!!checked}
        aria-label={ariaLabel}
      />
      <label htmlFor={inputId} />
    </div>
  );
};

export default PlainSwitch;
