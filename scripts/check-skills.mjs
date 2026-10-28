#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { frontmatter } from "./frontmatter.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillsRoot = join(root, "skills");
const forbidden = [
  /(^|[\s`'"=(,\[{])\/home\/[^\s`'"]+/,
  /(^|[\s`'"=(,\[{])\/Users\/[^\s`'"]+/,
  /(~|\$HOME|\$\{HOME\})\/\.agents\/references/,
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

const files = walk(skillsRoot);
const skillFiles = files.filter((file) => basename(file) === "SKILL.md");
const names = new Set();
const errors = [];
const descCap = 600;
const descBudget = 43000;
let descTotal = 0;

for (const file of skillFiles) {
  const rel = relative(root, file);
  let meta;
  try {
    meta = frontmatter(readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`${rel}: ${err.message}`);
    continue;
  }
  if (!/^z-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name)) {
    errors.push(`${rel}: invalid z-* skill name ${meta.name}`);
  }
  if (meta.name.length > 64) errors.push(`${rel}: name exceeds 64 chars`);
  if (!meta.description.trim()) errors.push(`${rel}: missing description`);
  if (meta.description.length > descCap) {
    errors.push(`${rel}: description is ${meta.description.length} chars, house cap ${descCap} (spec max 1024)`);
  }
  descTotal += meta.description.length;
  if (/[<>]/.test(meta.description)) {
    errors.push(`${rel}: description contains an angle bracket (< or >) — the Claude app rejects XML tags in descriptions; use {placeholder} or reword`);
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

function prose(text) {
  let fence;
  return text.split(/\r?\n/).map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return "";
    }
    if (marker) {
      fence = marker[1];
      return "";
    }
    return line.replace(/(`+).*?\1/g, "");
  }).join("\n");
}

for (const skill of skillFiles) {
  const skillRoot = dirname(skill);
  const pending = [skill];
  const seen = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = prose(readFileSync(file, "utf8"));
    const targets = [
      ...Array.from(text.matchAll(/\[\[([^\]#|]+)(?:[#|][^\]]*)?\]\]/g), (match) => ({ target: match[1], wiki: true })),
      ...Array.from(text.matchAll(/\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g), (match) => ({ target: match[1] ?? match[2], wiki: false })),
      ...Array.from(text.matchAll(/^ {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*(?:<([^>\n]+)>|([^\s]+))(?:[ \t]+["'][^"'\n]*["'])?[ \t]*$/gm), (match) => ({ target: match[1] ?? match[2], wiki: false })),
    ];
    for (const { target, wiki } of targets) {
      if (wiki && /^z-[^/]+$/.test(target)) {
        if (!names.has(target)) errors.push(`${relative(root, file)}: unresolved z-skill link [[${target}]]`);
        continue;
      }
      if (/^(?:[a-z][a-z0-9+.-]*:|[/#~])/i.test(target)) continue;
      let localTarget;
      try {
        localTarget = decodeURIComponent(target.split(/[?#]/)[0]);
      } catch {
        errors.push(`${relative(root, file)}: invalid local resource URI encoding ${target}`);
        continue;
      }
      if (!localTarget) continue;
      const path = resolve(dirname(file), localTarget);
      const resource = /^(?:references|assets|scripts)(?:[/\\]|$)/.test(relative(skillRoot, path));
      if (!resource) {
        if (/^(?:\.\.?\/)*(?:references|assets|scripts)(?:\/|$)/.test(localTarget)) {
          errors.push(`${relative(root, file)}: local resource leaves skill directory ${target}`);
        }
        continue;
      }
      if (!existsSync(path)) {
        errors.push(`${relative(root, file)}: missing local resource ${target}`);
      } else if (path.endsWith(".md") && statSync(path).isFile()) {
        pending.push(path);
      }
    }
  }
}

if (descTotal > descBudget) {
  errors.push(
    `skills: descriptions total ${descTotal} chars, budget ${descBudget} — harnesses skip skills past ~50 KB, trim the largest descriptions`,
  );
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${skillFiles.length} skills checked, ${descTotal}/${descBudget} description chars.`);
