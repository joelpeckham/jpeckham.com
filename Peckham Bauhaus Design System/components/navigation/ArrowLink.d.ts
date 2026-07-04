import * as React from "react";

/** Inline mono link with a sliding arrow and animated underline. */
export interface ArrowLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode;
  href?: string;
  /** Link + underline color. @default "var(--ink)" */
  color?: string;
}

export function ArrowLink(props: ArrowLinkProps): JSX.Element;
