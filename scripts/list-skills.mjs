#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { frontmatter } from "./frontmatter.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
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

const rows = walk(skillsRoot)
  .map((file) => ({ file, ...frontmatter(readFileSync(file, "utf8")) }))
  .sort((a, b) => a.name.localeCompare(b.name));

for (const row of rows) {
  console.log(`${row.name}\t${relative(root, row.file)}\t${row.description.replace(/\s+/g, " ").trim()}`);
}
