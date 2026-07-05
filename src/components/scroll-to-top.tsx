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

/*
 * When a card link navigates forward, we remember its href so that returning
 * to the list (browser Back or the breadcrumb) can center that card in the
 * viewport instead of restoring the raw offset it had when clicked.
 */
let restoreCardHref: string | null = null;

/*
 * Set when returning to a list via the breadcrumb without a card to restore
 * (e.g. a deep-linked article). Because the breadcrumb navigates with
 * `scroll={false}` to avoid fighting our centering, we scroll to the top here
 * as the sensible fallback.
 */
let scrollListToTopOnMount = false;

export function ScrollToTopLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        scrollToTopOnMount = true;
        restoreCardHref = String(props.href);
        props.onNavigate?.(event);
      }}
    />
  );
}

/*
 * Breadcrumb "All <section>" link. Uses `scroll={false}` so Next.js does not
 * force a scroll-to-top after navigation, which would override the card
 * centering performed by RestoreCardScrollOnMount. If no card is pending
 * (direct/deep-linked article), it falls back to scrolling to the top.
 */
export function BackToListLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        if (!restoreCardHref) scrollListToTopOnMount = true;
        props.onNavigate?.(event);
      }}
    />
  );
}

/*
 * True while a navigation back to a list page is pending. Reveal reads this at
 * mount to render its children already-visible (no entrance animation), so the
 * list appears as the user left it and the reverse cover morph lands on a
 * visible card instead of a card that is still faded out by its rise-in stagger.
 */
export function isReturningToList() {
  return restoreCardHref !== null || scrollListToTopOnMount;
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

export function RestoreCardScrollOnMount() {
  useLayoutEffect(() => {
    const href = restoreCardHref;
    const toTop = scrollListToTopOnMount;
    restoreCardHref = null;
    scrollListToTopOnMount = false;

    if (!href) {
      if (toTop) window.scrollTo(0, 0);
      return;
    }

    const restore = () => {
      const el = document.querySelector(`a[href="${CSS.escape(href)}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
      } else if (toTop) {
        window.scrollTo(0, 0);
      }
    };

    restore();
    // Re-apply after paint to beat any late scroll restoration from the router.
    const raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
