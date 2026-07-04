import * as React from "react";

/** Large graphic section title with numbered badge, mono eyebrow, and heavy ink rule. */
export interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section index shown in the badge, e.g. "01". */
  index?: string;
  /** Mono uppercase eyebrow. */
  eyebrow?: string;
  /** The big title. */
  title: string;
  /** Badge accent color var. @default "var(--red)" */
  accent?: string;
  /** @default "left" */
  align?: "left" | "center";
}

export function SectionHeading(props: SectionHeadingProps): JSX.Element;
