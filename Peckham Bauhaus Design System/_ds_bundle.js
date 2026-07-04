/* @ds-bundle: {"format":4,"namespace":"PeckhamBauhausDesignSystem_b025da","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"SectionHeading","sourcePath":"components/layout/SectionHeading.jsx"},{"name":"Shape","sourcePath":"components/layout/Shape.jsx"},{"name":"ArrowLink","sourcePath":"components/navigation/ArrowLink.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"11bfc93fb76f","components/core/Button.jsx":"19345885d873","components/core/Tag.jsx":"9732abe9dc16","components/forms/Input.jsx":"4d29393e05d8","components/forms/Textarea.jsx":"5b395b5093c2","components/layout/Card.jsx":"e36740a7965a","components/layout/SectionHeading.jsx":"894df6fcc17a","components/layout/Shape.jsx":"ac9cf4a65dac","components/navigation/ArrowLink.jsx":"f85eeb39a487","components/navigation/NavBar.jsx":"a109ae657fa8","ui_kits/portfolio/About.jsx":"35529aaeab23","ui_kits/portfolio/Contact.jsx":"19993ed1ae87","ui_kits/portfolio/Footer.jsx":"dec56d50d64a","ui_kits/portfolio/Hero.jsx":"c5b4d1928db5","ui_kits/portfolio/Work.jsx":"81b12ee52b6c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PeckhamBauhausDesignSystem_b025da = window.PeckhamBauhausDesignSystem_b025da || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — a filled square/number marker used to index sections
 * ("01", "02") or flag status. Bauhaus geometric block.
 */
function Badge({
  children,
  variant = "red",
  shape = "square",
  style = {},
  ...rest
}) {
  const palettes = {
    red: {
      bg: "var(--red)",
      fg: "var(--white)"
    },
    blue: {
      bg: "var(--blue)",
      fg: "var(--white)"
    },
    yellow: {
      bg: "var(--yellow)",
      fg: "var(--ink)"
    },
    ink: {
      bg: "var(--ink)",
      fg: "var(--paper)"
    }
  };
  const p = palettes[variant] || palettes.red;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "2em",
      height: "2em",
      padding: "0 0.5em",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      fontWeight: 700,
      color: p.fg,
      background: p.bg,
      border: "2px solid var(--ink)",
      borderRadius: shape === "circle" ? "var(--radius-full)" : "var(--radius-0)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Bauhaus block button with a hard offset shadow that
 * "presses" on active. Variants map to the primary palette.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  as = "button",
  disabled = false,
  block = false,
  style = {},
  ...rest
}) {
  const palettes = {
    primary: {
      bg: "var(--ink)",
      fg: "var(--paper)",
      bd: "var(--ink)"
    },
    red: {
      bg: "var(--red)",
      fg: "var(--white)",
      bd: "var(--ink)"
    },
    blue: {
      bg: "var(--blue)",
      fg: "var(--white)",
      bd: "var(--ink)"
    },
    yellow: {
      bg: "var(--yellow)",
      fg: "var(--ink)",
      bd: "var(--ink)"
    },
    outline: {
      bg: "transparent",
      fg: "var(--ink)",
      bd: "var(--ink)"
    }
  };
  const sizes = {
    sm: {
      pad: "8px 16px",
      fs: "var(--text-sm)"
    },
    md: {
      pad: "13px 26px",
      fs: "var(--text-body)"
    },
    lg: {
      pad: "18px 38px",
      fs: "var(--text-lg)"
    }
  };
  const p = palettes[variant] || palettes.primary;
  const s = sizes[size] || sizes.md;
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    disabled: as === "button" ? disabled : undefined,
    style: {
      display: block ? "flex" : "inline-flex",
      width: block ? "100%" : "auto",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.6em",
      padding: s.pad,
      fontFamily: "var(--font-mono)",
      fontSize: s.fs,
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: p.fg,
      background: p.bg,
      border: `2px solid ${p.bd}`,
      borderRadius: "var(--radius-0)",
      boxShadow: "var(--shadow-hard)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      transform: "translate(0,0)",
      ...style
    },
    onMouseDown: e => {
      if (!disabled) {
        e.currentTarget.style.transform = "translate(4px,4px)";
        e.currentTarget.style.boxShadow = "0 0 0 var(--ink)";
      }
    },
    onMouseUp: e => {
      if (!disabled) {
        e.currentTarget.style.transform = "translate(0,0)";
        e.currentTarget.style.boxShadow = "var(--shadow-hard)";
      }
    },
    onMouseLeave: e => {
      if (!disabled) {
        e.currentTarget.style.transform = "translate(0,0)";
        e.currentTarget.style.boxShadow = "var(--shadow-hard)";
      }
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — compact mono skill/keyword chip. Outlined by default,
 * filled variants pick up a primary color.
 */
function Tag({
  children,
  variant = "outline",
  style = {},
  ...rest
}) {
  const palettes = {
    outline: {
      bg: "transparent",
      fg: "var(--ink)",
      bd: "var(--ink)"
    },
    ink: {
      bg: "var(--ink)",
      fg: "var(--paper)",
      bd: "var(--ink)"
    },
    red: {
      bg: "var(--red)",
      fg: "var(--white)",
      bd: "var(--ink)"
    },
    blue: {
      bg: "var(--blue)",
      fg: "var(--white)",
      bd: "var(--ink)"
    },
    yellow: {
      bg: "var(--yellow)",
      fg: "var(--ink)",
      bd: "var(--ink)"
    }
  };
  const p = palettes[variant] || palettes.outline;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 12px",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      fontWeight: 500,
      letterSpacing: "0.04em",
      color: p.fg,
      background: p.bg,
      border: `2px solid ${p.bd}`,
      borderRadius: "var(--radius-0)",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — bordered text field with mono label. Sharp corners,
 * ink border, focus flips the border to an accent color.
 */
function Input({
  label,
  id,
  accent = "var(--blue)",
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-meta)",
      letterSpacing: "var(--track-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-body)",
      color: "var(--ink)",
      background: "var(--white)",
      padding: "12px 14px",
      border: `2px solid ${focus ? accent : "var(--ink)"}`,
      borderRadius: "var(--radius-0)",
      outline: "none",
      boxShadow: focus ? `3px 3px 0 ${accent}` : "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)"
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Textarea — multi-line sibling of Input. Same bordered treatment
 * and accent focus behavior.
 */
function Textarea({
  label,
  id,
  accent = "var(--blue)",
  rows = 5,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-meta)",
      letterSpacing: "var(--track-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: inputId,
    rows: rows,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-body)",
      color: "var(--ink)",
      background: "var(--white)",
      padding: "12px 14px",
      border: `2px solid ${focus ? accent : "var(--ink)"}`,
      borderRadius: "var(--radius-0)",
      outline: "none",
      resize: "vertical",
      boxShadow: focus ? `3px 3px 0 ${accent}` : "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)"
    }
  }, rest)));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — bordered surface with a hard offset shadow. Used for
 * projects, notes, contact blocks. Optional accent top-bar.
 */
function Card({
  children,
  accent,
  interactive = false,
  style = {},
  ...rest
}) {
  const [lift, setLift] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => interactive && setLift(true),
    onMouseLeave: () => interactive && setLift(false),
    style: {
      background: "var(--bg-surface)",
      border: "2px solid var(--ink)",
      borderRadius: "var(--radius-0)",
      boxShadow: lift ? "var(--shadow-hard-lg)" : "var(--shadow-hard)",
      transform: lift ? "translate(-3px,-3px)" : "translate(0,0)",
      transition: "transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
      overflow: "hidden",
      ...style
    }
  }, rest), accent && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      background: accent,
      borderBottom: "2px solid var(--ink)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5)"
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/layout/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SectionHeading — the brand's large graphic section title with a
 * numbered badge, mono eyebrow, and a heavy ink rule beneath.
 */
function SectionHeading({
  index,
  eyebrow,
  title,
  accent = "var(--red)",
  align = "left",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      justifyContent: align === "center" ? "center" : "flex-start",
      marginBottom: "var(--space-3)"
    }
  }, index && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: accent === "var(--blue)" ? "blue" : accent === "var(--yellow)" ? "yellow" : "red"
  }, index), eyebrow && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-meta)",
      letterSpacing: "var(--track-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, eyebrow)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--w-black)",
      fontSize: "var(--text-h1)",
      lineHeight: "var(--lh-snug)",
      letterSpacing: "var(--track-tight)",
      textTransform: "uppercase",
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: "var(--ink)",
      marginTop: "var(--space-4)"
    }
  }));
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/layout/Shape.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Shape — decorative Bauhaus geometric primitive (circle, half-circle,
 * quarter-circle, square, triangle, bar). Pure ornament; give it a size.
 */
function Shape({
  type = "circle",
  color = "var(--red)",
  size = 120,
  style = {},
  ...rest
}) {
  const base = {
    width: size,
    height: size,
    display: "inline-block",
    ...style
  };
  const map = {
    circle: {
      borderRadius: "var(--radius-full)",
      background: color
    },
    square: {
      background: color
    },
    bar: {
      width: size,
      height: Math.round(size / 3),
      background: color
    },
    half: {
      borderRadius: `${size}px ${size}px 0 0`,
      height: size / 2,
      background: color
    },
    quarter: {
      borderRadius: `${size}px 0 0 0`,
      background: color
    },
    ring: {
      borderRadius: "var(--radius-full)",
      background: "transparent",
      border: `${Math.max(6, size / 7)}px solid ${color}`
    },
    triangle: {
      width: 0,
      height: 0,
      background: "transparent",
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid ${color}`
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    style: {
      ...base,
      ...(map[type] || map.circle)
    }
  }, rest));
}
Object.assign(__ds_scope, { Shape });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Shape.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ArrowLink.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ArrowLink — inline link with a mono label and a sliding arrow.
 * Underlines via an animated ink bar on hover.
 */
function ArrowLink({
  children,
  href = "#",
  color = "var(--ink)",
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5em",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color,
      borderBottom: `2px solid ${hover ? color : "transparent"}`,
      paddingBottom: 2,
      transition: "border-color var(--dur) var(--ease-out)",
      ...style
    }
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      transform: hover ? "translateX(5px)" : "translateX(0)",
      transition: "transform var(--dur) var(--ease-out)"
    }
  }, "\u2192"));
}
Object.assign(__ds_scope, { ArrowLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ArrowLink.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NavBar — fixed-feel top bar: wordmark left, mono links right,
 * heavy ink bottom rule. Static/presentational.
 */
function NavBar({
  brand = "JOEL PECKHAM",
  items = ["Work", "About", "Contact"],
  active,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "var(--space-4) var(--space-6)",
      background: "var(--bg-page)",
      borderBottom: "3px solid var(--ink)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.6em",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--w-black)",
      fontSize: "var(--text-h4)",
      letterSpacing: "var(--track-tight)",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      background: "var(--red)",
      borderRadius: "var(--radius-full)",
      border: "2px solid var(--ink)"
    }
  }), brand), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-5)"
    }
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: active === it ? "var(--red)" : "var(--ink)",
      borderBottom: active === it ? "2px solid var(--red)" : "2px solid transparent",
      paddingBottom: 2
    }
  }, it))));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/About.jsx
try { (() => {
/* global React */
const {
  SectionHeading,
  Tag,
  Shape
} = window.PeckhamBauhausDesignSystem_b025da;
const STACK = ["TypeScript", "React", "Node", "Rust", "Go", "Postgres", "WASM", "CSS", "Figma"];
function About() {
  return /*#__PURE__*/React.createElement("section", {
    id: "about",
    style: {
      background: "var(--ink)",
      color: "var(--paper)",
      padding: "var(--space-9) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1.3fr 1fr",
      gap: "var(--space-8)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      color: "var(--yellow)"
    }
  }, "03 \xB7 About"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--w-black)",
      fontSize: "var(--text-h1)",
      textTransform: "uppercase",
      letterSpacing: "var(--track-tight)",
      lineHeight: "var(--lh-snug)",
      margin: "var(--space-3) 0 var(--space-5)"
    }
  }, "A decade of", /*#__PURE__*/React.createElement("br", null), " shipping software."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-lg)",
      lineHeight: "var(--lh-normal)",
      maxWidth: 560,
      color: "var(--paper)"
    }
  }, "I\u2019m Joel \u2014 an engineer who cares as much about the seams as the surface. I work end-to-end: design systems, front-of-stack interfaces, and the services that feed them. I like small teams, sharp constraints, and code that reads like prose."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      flexWrap: "wrap",
      marginTop: "var(--space-6)"
    }
  }, STACK.map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t,
    variant: "outline",
    style: {
      color: "var(--paper)",
      borderColor: "var(--paper)"
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 320
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 0,
      top: 0,
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: "var(--red)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      bottom: 0,
      width: 180,
      height: 90,
      borderRadius: "0 0 180px 180px",
      background: "var(--blue)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 80,
      bottom: 40,
      width: 0,
      height: 0,
      borderLeft: "50px solid transparent",
      borderRight: "50px solid transparent",
      borderTop: "90px solid var(--yellow)"
    }
  }))));
}
window.About = About;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/About.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/Contact.jsx
try { (() => {
/* global React */
const {
  SectionHeading,
  Input,
  Textarea,
  Button
} = window.PeckhamBauhausDesignSystem_b025da;
function Contact() {
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    id: "contact",
    style: {
      background: "var(--paper)",
      padding: "var(--space-9) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    index: "04",
    eyebrow: "Say hello",
    title: "Start a project",
    accent: "var(--red)",
    align: "center"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-7)"
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "var(--space-8)",
      border: "3px solid var(--ink)",
      background: "var(--yellow)",
      boxShadow: "var(--shadow-hard-lg)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      textTransform: "uppercase",
      margin: 0
    }
  }, "Message sent \u2731"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-2) 0 0"
    }
  }, "I\u2019ll reply within a day or two.")) : /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    placeholder: "Ada Lovelace",
    accent: "var(--red)",
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    placeholder: "you@studio.com",
    accent: "var(--blue)",
    required: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement(Textarea, {
    label: "Message",
    rows: 5,
    placeholder: "Tell me about the project\u2026",
    accent: "var(--red)",
    required: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1",
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    as: "button",
    variant: "red",
    size: "lg"
  }, "Send it \u2192"))))));
}
window.Contact = Contact;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/Contact.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/Footer.jsx
try { (() => {
/* global React */
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--ink)",
      color: "var(--paper)",
      borderTop: "3px solid var(--red)",
      padding: "var(--space-7) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.6em",
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      fontSize: "var(--text-h4)",
      textTransform: "uppercase",
      letterSpacing: "var(--track-tight)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      background: "var(--yellow)",
      borderRadius: "50%",
      border: "2px solid var(--paper)"
    }
  }), "Joel Peckham"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-5)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      letterSpacing: "0.06em",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "GitHub"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "LinkedIn"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Email")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--grey)"
    }
  }, "\xA9 2026 \xB7 Built by hand")));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/Hero.jsx
try { (() => {
/* global React */
const {
  Shape
} = window.PeckhamBauhausDesignSystem_b025da;
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "var(--paper)",
      borderBottom: "3px solid var(--ink)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -60,
      top: -60,
      width: 260,
      height: 260,
      borderRadius: "50%",
      background: "var(--blue)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 200,
      bottom: -80,
      width: 220,
      height: 110,
      borderRadius: "220px 220px 0 0",
      background: "var(--yellow)",
      border: "3px solid var(--ink)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "42%",
      top: 40,
      width: 0,
      height: 0,
      borderLeft: "44px solid transparent",
      borderRight: "44px solid transparent",
      borderBottom: "80px solid var(--red)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "label",
    style: {
      color: "var(--grey)"
    }
  }, "Developer \xB7 Designer \xB7 Huntington, WV"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--w-black)",
      fontSize: "var(--text-mega)",
      lineHeight: "var(--lh-tight)",
      letterSpacing: "var(--track-tight)",
      textTransform: "uppercase",
      margin: "var(--space-3) 0 var(--space-5)",
      maxWidth: 900
    }
  }, "I build", /*#__PURE__*/React.createElement("br", null), "things that", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--red)"
    }
  }, "ship.")), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 520,
      fontSize: "var(--text-lg)",
      lineHeight: "var(--lh-normal)"
    }
  }, "Joel Peckham \u2014 full-stack engineer crafting fast, legible interfaces and the systems behind them."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-4)",
      marginTop: "var(--space-6)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#work",
    style: btn("var(--ink)", "var(--paper)")
  }, "View work \u2192"), /*#__PURE__*/React.createElement("a", {
    href: "#contact",
    style: btn("transparent", "var(--ink)")
  }, "Get in touch"))));
}
function btn(bg, fg) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.6em",
    padding: "16px 34px",
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-body)",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: fg,
    background: bg,
    border: "2px solid var(--ink)",
    boxShadow: "var(--shadow-hard)"
  };
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/Work.jsx
try { (() => {
/* global React */
const {
  SectionHeading,
  Card,
  Tag,
  ArrowLink
} = window.PeckhamBauhausDesignSystem_b025da;
const PROJECTS = [{
  n: "01",
  title: "Ledger",
  accent: "var(--red)",
  desc: "Realtime finance dashboard with a keyboard-first ledger and audit trail.",
  tags: ["TypeScript", "React", "Postgres"]
}, {
  n: "02",
  title: "Foundry",
  accent: "var(--blue)",
  desc: "Variable-font playground and specimen generator for type designers.",
  tags: ["WebGL", "Rust/WASM"]
}, {
  n: "03",
  title: "Signal",
  accent: "var(--yellow)",
  desc: "Self-hosted uptime + log aggregation with a zero-config agent.",
  tags: ["Go", "ClickHouse"]
}, {
  n: "04",
  title: "Atlas",
  accent: "var(--ink)",
  desc: "Map-based routing tool for field teams, offline-first PWA.",
  tags: ["Svelte", "MapLibre"]
}];
function Work() {
  return /*#__PURE__*/React.createElement("section", {
    id: "work",
    style: {
      background: "var(--paper)",
      padding: "var(--space-9) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    index: "02",
    eyebrow: "Selected work",
    title: "Projects",
    accent: "var(--blue)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "var(--space-5)",
      marginTop: "var(--space-7)"
    }
  }, PROJECTS.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.n,
    accent: p.accent,
    interactive: true,
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-h3)",
      textTransform: "uppercase",
      margin: 0
    }
  }, p.title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      color: "var(--grey)"
    }
  }, p.n)), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#3a352e",
      margin: "var(--space-3) 0 var(--space-4)",
      flex: 1
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      flexWrap: "wrap",
      marginBottom: "var(--space-4)"
    }
  }, p.tags.map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t))), /*#__PURE__*/React.createElement(ArrowLink, {
    href: "#",
    color: "var(--ink)"
  }, "Case study"))))));
}
window.Work = Work;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/Work.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Shape = __ds_scope.Shape;

__ds_ns.ArrowLink = __ds_scope.ArrowLink;

__ds_ns.NavBar = __ds_scope.NavBar;

})();
