import * as React from "react";

/** Compact mono skill/keyword chip. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** @default "outline" */
  variant?: "outline" | "ink" | "red" | "blue" | "yellow";
}

export function Tag(props: TagProps): JSX.Element;
