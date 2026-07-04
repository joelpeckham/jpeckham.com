import * as React from "react";

/** Bordered text field with mono label; focus flips border to accent. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Mono uppercase label above the field. */
  label?: string;
  /** Focus accent color var. @default "var(--blue)" */
  accent?: string;
}

export function Input(props: InputProps): JSX.Element;
