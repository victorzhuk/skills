#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const skillsRoot = join(root, "skills");
const forbidden = [
  /(^|[\s`'"])\/home\/[^\s`'"]+/,
  /(^|[\s`'"])\/Users\/[^\s`'"]+/,
  /~\/\.agents\/references/,
  /rules\/commits\.md/,
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fm = match[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  const descLine = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  let description = descLine;
  let style = "plain";
  const singleQuoted = /^'[\s\S]*'$/.test(descLine);
  const doubleQuoted = /^"[\s\S]*"$/.test(descLine);
  if (singleQuoted) {
    description = descLine.slice(1, -1).replace(/''/g, "'");
    style = "single";
  } else if (doubleQuoted) {
    description = descLine.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    style = "double";
  } else if ([">", "|", ">-", "|-"].includes(descLine)) {
    const lines = fm.split("\n");
    const start = lines.findIndex((line) => line.startsWith("description:"));
    const block = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (/^[a-zA-Z0-9_-]+:/.test(lines[i])) break;
      block.push(lines[i].trim());
    }
    description = block.filter(Boolean).join(" ");
    style = "block";
  }
  return { name, description, descLine, style };
}

const files = walk(skillsRoot);
const skillFiles = files.filter((file) => basename(file) === "SKILL.md");
const names = new Set();
const errors = [];

for (const file of skillFiles) {
  const rel = relative(root, file);
  const meta = frontmatter(file);
  if (!meta) {
    errors.push(`${rel}: missing frontmatter`);
    continue;
  }
  if (!/^z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name)) {
    errors.push(`${rel}: invalid z-* skill name ${meta.name}`);
  }
  if (meta.name.length > 64) errors.push(`${rel}: name exceeds 64 chars`);
  if (!meta.description.trim()) errors.push(`${rel}: missing description`);
  if (meta.description.length > 1024) errors.push(`${rel}: description exceeds 1024 chars`);
  if (meta.style === "plain" && meta.descLine.includes(": ")) {
    errors.push(`${rel}: description has unquoted ": " — breaks strict YAML parsers, quote the value`);
  }
  if (basename(dirname(file)) !== meta.name) {
    errors.push(`${rel}: directory basename must match frontmatter name`);
  }
  if (names.has(meta.name)) errors.push(`${rel}: duplicate skill name ${meta.name}`);
  names.add(meta.name);
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) errors.push(`${relative(root, file)}: forbidden personal marker ${pattern}`);
  }
}

for (const file of skillFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/\[\[(z-[^\]#|]+)(?:[#|][^\]]*)?\]\]/g)) {
    if (!names.has(match[1])) errors.push(`${relative(root, file)}: unresolved z-skill link [[${match[1]}]]`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${skillFiles.length} skills checked.`);
