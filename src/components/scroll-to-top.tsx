"use client";

import { useLayoutEffect, type ComponentProps } from "react";
import Link from "next/link";

/*
 * Next.js's built-in scroll handling scrolls the first element of the changed
 * route segment into view. Because ArticleShell renders in each article's
 * layout, that segment is the MDX body, so navigation can land mid-article
 * (or keep the list page's scroll offset). Instead, card links set this flag
 * and the article shell scrolls to the top on mount. Doing it in a layout
 * effect means it happens inside the view transition, so the card-to-hero
 * morph animates to the top of the page without a visible jump.
 */
let scrollToTopOnMount = false;

export function ScrollToTopLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        scrollToTopOnMount = true;
        props.onNavigate?.(event);
      }}
    />
  );
}

export function ScrollToTopOnMount() {
  useLayoutEffect(() => {
    if (scrollToTopOnMount) {
      scrollToTopOnMount = false;
      window.scrollTo(0, 0);
    }
  }, []);
  return null;
}
