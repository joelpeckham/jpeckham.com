import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import Link from "next/link";
import Image from "next/image";

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith("http://") || href.startsWith("https://");
}

function MdxLink({
  href,
  children,
  ...props
}: ComponentProps<"a">) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  if (href?.startsWith("mailto:") || href?.startsWith("tel:")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  if (!href) {
    return <span {...props}>{children}</span>;
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

function MdxImage({
  src,
  alt,
  width,
  height,
  ...props
}: ComponentProps<"img">) {
  if (!src || typeof src !== "string") return null;

  const parsedWidth = typeof width === "number" ? width : Number(width) || 800;
  const parsedHeight = typeof height === "number" ? height : Number(height) || 450;

  if (src.endsWith(".svg")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={parsedWidth}
      height={parsedHeight}
      loading="lazy"
      className="h-auto w-full"
      {...props}
    />
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: MdxLink,
    img: MdxImage,
    ...components,
  };
}
