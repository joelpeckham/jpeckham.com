import * as React from "react";

/**
 * Bauhaus block button with a hard offset shadow.
 *
 * @startingPoint section="Core" subtitle="Block button with hard shadow" viewport="700x160"
 */
export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** Color treatment. @default "primary" */
  variant?: "primary" | "red" | "blue" | "yellow" | "outline";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Element/tag to render. @default "button" */
  as?: "button" | "a" | string;
  disabled?: boolean;
  /** Full-width. @default false */
  block?: boolean;
}

export function Button(props: ButtonProps): JSX.Element;
