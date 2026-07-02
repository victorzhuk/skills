#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const skillsRoot = join(root, "skills");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (entry === "SKILL.md") out.push(path);
  }
  return out;
}

function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { name: "", description: "" };
  const fm = match[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const descLine = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  let description = descLine;
  if (/^'[\s\S]*'$/.test(descLine)) {
    description = descLine.slice(1, -1).replace(/''/g, "'");
  } else if (/^"[\s\S]*"$/.test(descLine)) {
    description = descLine.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if ([">", "|", ">-", "|-"].includes(description)) {
    const lines = fm.split("\n");
    const start = lines.findIndex((line) => line.startsWith("description:"));
    const block = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (/^[a-zA-Z0-9_-]+:/.test(lines[i])) break;
      block.push(lines[i].trim());
    }
    description = block.filter(Boolean).join(" ");
  }
  return { name, description: description.replace(/\s+/g, " ") };
}

const rows = walk(skillsRoot)
  .map((file) => ({ file, ...frontmatter(file) }))
  .sort((a, b) => a.name.localeCompare(b.name));

for (const row of rows) {
  console.log(`${row.name}\t${relative(root, row.file)}\t${row.description}`);
}
