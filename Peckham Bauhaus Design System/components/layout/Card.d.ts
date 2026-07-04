import * as React from "react";

/**
 * Bordered surface with a hard offset shadow.
 *
 * @startingPoint section="Layout" subtitle="Bordered card with hard shadow" viewport="700x260"
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Optional accent top-bar color (e.g. "var(--red)"). */
  accent?: string;
  /** Lift on hover. @default false */
  interactive?: boolean;
}

export function Card(props: CardProps): JSX.Element;
