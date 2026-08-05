import { Fragment } from "react";

/**
 * A small markdown renderer, in the same spirit as components/icons.js and
 * components/charts/ — hand-written rather than pulling in a dependency.
 *
 * It renders to React elements, never to an HTML string, so there is no
 * dangerouslySetInnerHTML anywhere and therefore no XSS surface: anything the
 * parser doesn't recognise ends up as a text node, escaped by React.
 *
 * Supported: headings (#..######), bold, italic, inline code, links, unordered
 * and ordered lists, blockquotes, fenced code blocks, horizontal rules, and
 * paragraphs. Deliberately not supported: tables, images, nested lists, and
 * reference links — a table page is the right tool for tabular data here.
 */

const BOLD = /\*\*([^*]+)\*\*/;
const ITALIC = /(?<!\*)\*([^*]+)\*(?!\*)/;
const CODE = /`([^`]+)`/;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;

// Only http(s) and mailto links are rendered as anchors. This blocks
// javascript: and data: URLs, which would otherwise be a script vector.
function safeHref(url) {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

/**
 * Inline formatting. Finds whichever marker appears earliest, splits around it,
 * and recurses on both sides — so nesting like **bold with `code`** works
 * without a full tokeniser.
 */
function renderInline(text, keyPrefix = "i") {
  if (!text) return null;

  const candidates = [
    { kind: "code", match: CODE.exec(text) },
    { kind: "link", match: LINK.exec(text) },
    { kind: "bold", match: BOLD.exec(text) },
    { kind: "italic", match: ITALIC.exec(text) },
  ].filter((c) => c.match);

  if (!candidates.length) return text;

  const first = candidates.reduce((a, b) => (a.match.index <= b.match.index ? a : b));
  const { kind, match } = first;

  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);

  let element;
  if (kind === "code") {
    // Inline code is intentionally not recursed into — backticks mean literal.
    element = <code key={`${keyPrefix}-c`}>{match[1]}</code>;
  } else if (kind === "link") {
    const href = safeHref(match[2]);
    element = href ? (
      <a key={`${keyPrefix}-a`} href={href} target="_blank" rel="noreferrer noopener">
        {match[1]}
      </a>
    ) : (
      // Unsafe scheme: show the label as plain text rather than a dead link.
      <Fragment key={`${keyPrefix}-a`}>{match[1]}</Fragment>
    );
  } else if (kind === "bold") {
    element = <strong key={`${keyPrefix}-b`}>{renderInline(match[1], `${keyPrefix}-b`)}</strong>;
  } else {
    element = <em key={`${keyPrefix}-e`}>{renderInline(match[1], `${keyPrefix}-e`)}</em>;
  }

  return (
    <>
      {renderInline(before, `${keyPrefix}-l`)}
      {element}
      {renderInline(after, `${keyPrefix}-r`)}
    </>
  );
}

/**
 * Parse markdown into an array of React block elements.
 * `styles` is the caller's CSS module so the output picks up page styling.
 */
export function renderMarkdown(source, styles = {}) {
  const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];

  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block — consumed verbatim until the closing fence.
    if (/^```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // step past the closing fence
      blocks.push(
        <pre className={styles.pre} key={key++}>
          <code>{body.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr className={styles.hr} key={key++} />);
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = `h${heading[1].length}`;
      blocks.push(
        <Tag className={styles.heading} key={key++}>
          {renderInline(heading[2], `h${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote className={styles.blockquote} key={key++}>
          {renderInline(body.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul className={styles.list} key={key++}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item, `u${key}-${n}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol className={styles.list} key={key++}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item, `o${key}-${n}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph: consecutive non-blank lines that didn't match anything above.
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|```|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) {
      blocks.push(
        <p className={styles.paragraph} key={key++}>
          {renderInline(para.join(" "), `p${key}`)}
        </p>
      );
    } else {
      // Nothing consumed this line — skip it so the loop can't spin forever.
      i++;
    }
  }

  return blocks;
}
