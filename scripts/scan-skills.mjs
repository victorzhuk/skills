#!/usr/bin/env node
// Static security scan of every skill with NVIDIA SkillSpector.
//
//   npm run scan                       scan all skills
//   npm run scan -- --accept z-name…   re-baseline the named skills after review
//
// Reviewed findings live in .skillspector/<name>.json as glob rules on rule id +
// file + matched text. `skillspector baseline` fingerprints are not used: they
// cover only the first of repeated matches (NVIDIA/skillspector#633) and bind
// the whole file hash, so any edit to a file would resurface all its findings.
// Fails on a new HIGH or CRITICAL finding or a scan error.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = new URL("..", import.meta.url).pathname;
const baselines = join(root, ".skillspector");
const blocking = new Set(["HIGH", "CRITICAL"]);

const skills = new Map();
for (const domain of readdirSync(join(root, "skills"), { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  for (const skill of readdirSync(join(root, "skills", domain.name), { withFileTypes: true })) {
    const dir = join(root, "skills", domain.name, skill.name);
    if (skill.isDirectory() && existsSync(join(dir, "SKILL.md"))) skills.set(skill.name, dir);
  }
}

const args = process.argv.slice(2);
const accept = args[0] === "--accept";
const names = accept ? args.slice(1) : args.length ? args : [...skills.keys()].sort();
if (accept && names.length === 0) {
  console.error("usage: npm run scan -- --accept z-name…");
  process.exit(2);
}
for (const name of names) {
  if (!skills.has(name)) {
    console.error(`unknown skill: ${name}`);
    process.exit(2);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "skillspector-"));

async function scan(name, baseline) {
  const out = join(tmp, `${name}.json`);
  const flags = ["scan", skills.get(name), "--no-llm", "-f", "json", "-o", out];
  if (baseline && existsSync(baseline)) flags.push("--baseline", baseline);
  try {
    await run("skillspector", flags, { timeout: 300_000, maxBuffer: 64 << 20 });
  } catch (err) {
    // Exit 1 only means the skill scored as risky; the report is judged below.
    if (err.code !== 1) throw new Error(`${name}: ${err.stderr?.trim() || err.message}`);
  }
  return JSON.parse(readFileSync(out, "utf8"));
}

async function pool(items, fn) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]).catch((err) => ({ error: err.message }));
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, availableParallelism() >> 1) }, worker));
  return results;
}

const escapeGlob = (s) => s.replace(/[[*?]/g, (c) => `[${c}]`);
// Repeated matches are reported with the first occurrence text but suppressed
// per occurrence, and occurrences differ in whitespace.
const textGlob = (s) => `*${escapeGlob(s.trim()).replace(/\s+/g, "*")}*`;

try {
  if (accept) {
    mkdirSync(baselines, { recursive: true });
    const reason = `reviewed ${new Date().toISOString().slice(0, 10)}`;
    for (const name of names) {
      const report = await scan(name);
      const rules = new Map();
      for (const issue of report.issues) {
        const rule = { id: issue.id, path: escapeGlob(issue.location.file) };
        if (issue.finding) rule.message = textGlob(issue.finding);
        rules.set(JSON.stringify(rule), { ...rule, reason });
      }
      const file = join(baselines, `${name}.json`);
      writeFileSync(file, JSON.stringify({ version: 2, rules: [...rules.values()], fingerprints: [] }, null, 2) + "\n");
      console.log(`baselined ${name} (${rules.size} rules)`);
    }
  } else {
    const reports = await pool(names, (name) => scan(name, join(baselines, `${name}.json`)));
    let failed = false;
    names.forEach((name, i) => {
      const report = reports[i];
      if (report.error) {
        console.log(`ERROR ${report.error}`);
        failed = true;
        return;
      }
      for (const issue of report.issues) {
        console.log(`${issue.severity}\t${name}\t${issue.id} ${issue.pattern ?? ""}\t${issue.location.file}:${issue.location.start_line}`);
        if (blocking.has(issue.severity)) failed = true;
      }
    });
    console.log(`scanned ${names.length} skills`);
    if (failed) {
      console.error("new HIGH/CRITICAL findings or scan errors; review, then: npm run scan -- --accept <name>");
      process.exitCode = 1;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
