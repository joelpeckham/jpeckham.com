import * as React from "react";

/** Multi-line text field; matches Input's bordered accent-focus treatment. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Mono uppercase label. */
  label?: string;
  /** Focus accent color var. @default "var(--blue)" */
  accent?: string;
  /** @default 5 */
  rows?: number;
}

export function Textarea(props: TextareaProps): JSX.Element;
