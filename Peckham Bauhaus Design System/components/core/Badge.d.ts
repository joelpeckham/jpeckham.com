import * as React from "react";

/** Filled square/number marker for indexing sections or flagging status. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** @default "red" */
  variant?: "red" | "blue" | "yellow" | "ink";
  /** @default "square" */
  shape?: "square" | "circle";
}

export function Badge(props: BadgeProps): JSX.Element;
