const fields = new Set(["name", "description", "allowed-tools"]);

function scalar(value) {
  if (value.startsWith("'")) {
    const match = value.match(/^'((?:[^']|'')*)'(?:\s+#.*)?$/);
    if (!match) throw new Error("invalid single-quoted string");
    return match[1].replace(/''/g, "'");
  }
  if (value.startsWith('"')) {
    const match = value.match(/^("(?:[^"\\]|\\.)*")(?:\s+#.*)?$/);
    if (!match) throw new Error("invalid double-quoted string");
    try {
      return JSON.parse(match[1]);
    } catch {
      throw new Error("invalid double-quoted string; use JSON-compatible escapes");
    }
  }
  value = value.replace(/\s+#.*$/, "").trimEnd();
  if (!value || /^(?:null|~|true|false|yes|no|on|off)$/i.test(value) ||
      /^[+-]?(?:0x[\da-f_]+|0o[0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.[\d_]+)(?:e[+-]?\d+)?|\.inf|\.nan)$/i.test(value)) {
    throw new Error("expected a string; quote non-string YAML values");
  }
  if (/^[\[\]{},&*!|>@`%#]/.test(value) || /^[-?:](?:\s|$)/.test(value) || /:(?:\s|$)/.test(value)) {
    throw new Error("unsupported YAML scalar; quote the value");
  }
  return value;
}

export function frontmatter(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end === -1) throw new Error("missing frontmatter delimiters");
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]/.test(lines.slice(1, end).join("\n"))) {
    throw new Error("frontmatter contains a non-printable character");
  }
  const meta = {};
  for (let i = 1; i < end; i++) {
    if (/^\s*(?:#.*)?$/.test(lines[i])) continue;
    const match = lines[i].match(/^([a-z][a-z-]*):(?:[ \t]+(.*))?$/);
    if (!match) throw new Error(`line ${i + 1}: expected an unindented field with a string value`);
    const [, key, raw = ""] = match;
    if (!fields.has(key)) throw new Error(`line ${i + 1}: unsupported frontmatter field ${key}`);
    if (Object.hasOwn(meta, key)) throw new Error(`line ${i + 1}: duplicate frontmatter field ${key}`);
    const value = raw.trim();
    const block = value.match(/^([>|])([-+]?)(?:\s+#.*)?$/);
    if (!block) {
      try {
        meta[key] = scalar(value);
      } catch (err) {
        throw new Error(`line ${i + 1}: ${key}: ${err.message}`);
      }
      continue;
    }
    const content = [];
    let indent;
    while (i + 1 < end && /^(?:\s|$)/.test(lines[i + 1])) {
      const line = lines[++i];
      if (!line.trim()) {
        content.push("");
        continue;
      }
      const spaces = line.match(/^ +/)?.[0].length;
      indent ??= spaces;
      if (!spaces || spaces !== indent || line[spaces] === "\t") {
        throw new Error(`line ${i + 1}: use consistent space indentation in block strings`);
      }
      content.push(line.slice(spaces));
    }
    let result = content.length ? content.join("\n") + "\n" : "";
    if (block[1] === ">") {
      result = result.replace(/\n+/g, (breaks, offset) =>
        offset === 0 || offset + breaks.length === result.length
          ? breaks : breaks.length === 1 ? " " : breaks.slice(1));
    }
    if (block[2] !== "+") result = result.replace(/\n+$/, block[2] === "-" ? "" : "\n");
    meta[key] = result;
  }
  for (const key of ["name", "description"]) {
    if (!meta[key]?.trim()) throw new Error(`missing ${key}`);
  }
  return meta;
}
