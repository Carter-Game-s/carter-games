"use client";
import { useState, memo } from "react";
import { Copy, Check } from "lucide-react";
function inline(value: string): React.ReactNode[] {
  return value
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\)|\*[^*]+\*)/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={i}>{part.slice(1, -1)}</code>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{part.slice(1, -1)}</em>;
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        try {
          const url = new URL(link[2]);
          if (
            ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          )
            return (
              <a
                key={i}
                href={url.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link[1]}
              </a>
            );
        } catch {}
        return link[1];
      }
      return part;
    });
}
function highlight(code: string) {
  return code
    .split(
      /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|#[^\n]*|\b(?:const|let|var|function|return|if|else|for|while|import|from|export|class|def|print|True|False|null|true|false|async|await|try|catch|throw|new)\b|\b\d+(?:\.\d+)?\b)/g,
    )
    .map((token, i) => (
      <span
        key={i}
        className={
          /^['"]/.test(token)
            ? "syntax-string"
            : /^(\/\/|#)/.test(token)
              ? "syntax-comment"
              : /^\d/.test(token)
                ? "syntax-number"
                : /^(const|let|var|function|return|if|else|for|while|import|from|export|class|def|print|True|False|null|true|false|async|await|try|catch|throw|new)$/.test(
                      token,
                    )
                  ? "syntax-keyword"
                  : undefined
        }
      >
        {token}
      </span>
    ));
}
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="code-block">
      <div className="section-head">
        <span>{language || "code"}</span>
        <button
          aria-label="Copy code block"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setError("");
            } catch {
              setCopied(false);
              setError(
                "Clipboard unavailable. Select the code text to copy it.",
              );
            }
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre>
        <code>{highlight(code)}</code>
      </pre>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
function MarkdownContent({ content }: { content: string }) {
  const sections = content.split(/```([^\n`]*)\n([\s\S]*?)(?:```|$)/g);
  return (
    <div className="markdown">
      {sections.map((part, i) => {
        if (i % 3 === 1) return null;
        if (i % 3 === 2)
          return (
            <CodeBlock
              key={i}
              code={part}
              language={sections[i - 1].replace(/[^\w+#.-]/g, "").slice(0, 30)}
            />
          );
        return part
          .split(/\n\n+/)
          .filter(Boolean)
          .map((block, j) => {
            const lines = block.split("\n");
            if (/^#{1,6} /.test(block)) {
              const level = block.match(/^#+/)![0].length;
              return level <= 2 ? (
                <h3 key={`${i}-${j}`}>{inline(block.replace(/^#+ /, ""))}</h3>
              ) : (
                <h4 key={`${i}-${j}`}>{inline(block.replace(/^#+ /, ""))}</h4>
              );
            }
            if (lines.every((l) => /^[-*] /.test(l)))
              return (
                <ul key={`${i}-${j}`}>
                  {lines.map((l, k) => (
                    <li key={k}>{inline(l.slice(2))}</li>
                  ))}
                </ul>
              );
            if (lines.every((l) => /^\d+\. /.test(l)))
              return (
                <ol key={`${i}-${j}`}>
                  {lines.map((l, k) => (
                    <li key={k}>{inline(l.replace(/^\d+\. /, ""))}</li>
                  ))}
                </ol>
              );
            if (block.startsWith("> "))
              return (
                <blockquote key={`${i}-${j}`}>
                  {inline(block.replace(/^> /gm, ""))}
                </blockquote>
              );
            return (
              <p key={`${i}-${j}`}>
                {lines.map((line, k) => (
                  <span key={k}>
                    {k > 0 && <br />}
                    {inline(line)}
                  </span>
                ))}
              </p>
            );
          });
      })}
    </div>
  );
}

export const Markdown = memo(MarkdownContent);
