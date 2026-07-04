import * as React from "react";

/**
 * Top navigation bar: wordmark + mono links + heavy ink rule.
 *
 * @startingPoint section="Navigation" subtitle="Portfolio top nav bar" viewport="900x90"
 */
export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Wordmark text. @default "JOEL PECKHAM" */
  brand?: string;
  /** Nav item labels. @default ["Work","About","Contact"] */
  items?: string[];
  /** Currently-active item label. */
  active?: string;
}

export function NavBar(props: NavBarProps): JSX.Element;
