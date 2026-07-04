import * as React from "react";

/**
 * Decorative Bauhaus geometric primitive — pure ornament.
 *
 * @startingPoint section="Layout" subtitle="Geometric decorative shapes" viewport="700x220"
 */
export interface ShapeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "circle" */
  type?: "circle" | "square" | "bar" | "half" | "quarter" | "ring" | "triangle";
  /** CSS color / var. @default "var(--red)" */
  color?: string;
  /** Pixel size. @default 120 */
  size?: number;
}

export function Shape(props: ShapeProps): JSX.Element;
