import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const scripts = ["check-skills.mjs", "list-skills.mjs", "frontmatter.mjs"];

function fixture(t, metadata, body = "# Fixture\n", resources = {}) {
  const dir = mkdtempSync(join(tmpdir(), "skills-check-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "scripts"));
  for (const script of scripts) cpSync(join(root, "scripts", script), join(dir, "scripts", script));
  const skill = join(dir, "skills", "engineering", "z-fixture");
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), `---\n${metadata}\n---\n${body}`);
  for (const [name, text] of Object.entries(resources)) {
    const path = join(skill, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return dir;
}

function run(dir, script = "check-skills.mjs") {
  const result = spawnSync(process.execPath, [join(dir, "scripts", script)], {
    cwd: dir, encoding: "utf8", timeout: 5000,
  });
  assert.ifError(result.error);
  return result;
}

test("catalog metadata and resource links pass the CLI", () => {
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^OK: \d+ skills checked,/);
});

test("supported string forms agree between check and list", async (t) => {
  const cases = [
    ["name: z-fixture\ndescription: Plain description # comment", "Plain description"],
    ["name: z-fixture\ndescription: 3D graphics", "3D graphics"],
    ["name: 'z-fixture'\ndescription: 'Quoted ''word'': description'", "Quoted 'word': description"],
    ['name: "z-fixture"\ndescription: "Quoted \\"word\\": description"', 'Quoted "word": description'],
    ["name: z-fixture\ndescription: >\n  First line\n  second line", "First line second line"],
    ["name: z-fixture\ndescription: |-\n  First line\n  second line\nallowed-tools: Read Bash(node:*)", "First line second line"],
  ];
  for (const [metadata, expected] of cases) {
    await t.test(expected, (t) => {
      const dir = fixture(t, metadata);
      const checked = run(dir);
      assert.equal(checked.status, 0, checked.stderr);
      const listed = run(dir, "list-skills.mjs");
      assert.equal(listed.status, 0, listed.stderr);
      assert.equal(listed.stdout.trim(), `z-fixture\tskills/engineering/z-fixture/SKILL.md\t${expected}`);
    });
  }
});

test("malformed and non-string metadata fail the CLI", async (t) => {
  const cases = [
    ['description: "', /invalid double-quoted string/],
    ["description: 'unterminated", /invalid single-quoted string/],
    ['description: "bad\\q"', /JSON-compatible escapes/],
    ["description: null", /expected a string/],
    ["description: false", /expected a string/],
    ["description: 42", /expected a string/],
    ["description: text\x00", /non-printable character/],
    ["description: [Read, Write]", /unsupported YAML scalar/],
    ["description: {text: value}", /unsupported YAML scalar/],
    ["description: &shared text", /unsupported YAML scalar/],
    ["description: prefix: value", /unsupported YAML scalar/],
    ["description: Fixture\nversion: 1", /unsupported frontmatter field version/],
    ["description: Fixture\ndescription: Duplicate", /duplicate frontmatter field description/],
    ["description: Fixture\nallowed-tools: null", /allowed-tools: expected a string/],
    ["description: >\n  First line\n   Different indent", /consistent space indentation/],
  ];
  for (const [metadata, diagnostic] of cases) {
    await t.test(metadata, (t) => {
      const result = run(fixture(t, `name: z-fixture\n${metadata}`));
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, diagnostic);
    });
  }
});

test("missing linked resources fail, including links inside references", async (t) => {
  for (const body of ["Read [[references/missing.md]].", "Run [helper](scripts/missing.sh).", "Use [template](assets/missing.md)."]) {
    await t.test(body, (t) => {
      const result = run(fixture(t, "name: z-fixture\ndescription: Fixture", body));
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /missing local resource/);
    });
  }
  await t.test("nested reference", (t) => {
    const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [[references/guide.md]].", {
      "references/guide.md": "Read [details](details.md).\n",
    });
    const result = run(dir);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /references\/guide.md: missing local resource details.md/);
  });
});

test("valid resources and skill links pass while examples are ignored", (t) => {
  const dir = fixture(t, "name: z-fixture\ndescription: Fixture", [
    "Read [[references/guide.md#section|guide]] and [[z-fixture]].",
    "Run [helper](scripts/check.sh) with [template](assets/template.md).",
    "Example `[[references/inline-example.md]]`.",
    "```markdown", "Read [[references/fenced-example.md]].", "```",
    "~~~markdown", "Read [example](assets/fenced-example.md).", "~~~",
    "Application output: [context](./src/CONTEXT.md).",
  ].join("\n"), {
    "references/guide.md": "Read [details](details.md) and [named file](z-example.md).\n```markdown\n[output](./src/CONTEXT.md)\n```",
    "references/details.md": "See [[z-fixture]].",
    "references/z-example.md": "# Example\n",
    "scripts/check.sh": "exit 0\n",
    "assets/template.md": "# Template\n",
  });
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
});

test("unknown skill links in referenced prose fail", (t) => {
  const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [[references/guide.md]].", {
    "references/guide.md": "Read [[z-missing]].",
  });
  const result = run(dir);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /unresolved z-skill link \[\[z-missing\]\]/);
});

test("reference-style links validate plain and angle-bracket targets", async (t) => {
  for (const target of ["references/missing.md", "<references/missing.md>"]) {
    await t.test(target, (t) => {
      const body = `Read [guide][details].\n\n[details]: ${target}\n`;
      const result = run(fixture(t, "name: z-fixture\ndescription: Fixture", body));
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /missing local resource references\/missing.md/);
    });
  }
  await t.test("nested definitions resolve existing files", (t) => {
    const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [guide][details].\n\n[details]: references/guide.md\n", {
      "references/guide.md": "Read [details][nested].\n\n[nested]: <details.md>\n",
      "references/details.md": "# Details\n",
    });
    const result = run(dir);
    assert.equal(result.status, 0, result.stderr);
  });
  await t.test("nested definitions reject missing files", (t) => {
    const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [guide][details].\n\n[details]: <references/guide.md>\n", {
      "references/guide.md": "Read [details][nested].\n\n[nested]: missing.md\n",
    });
    const result = run(dir);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /references\/guide.md: missing local resource missing.md/);
  });
});

test("resource URIs decode paths after removing query and fragment", async (t) => {
  await t.test("encoded paths and nested definitions resolve", (t) => {
    const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [guide](references/my%20guide.md?raw=1#section).", {
      "references/my guide.md": "Read [details][nested].\n\n[nested]: <details%20file%23%3F.md?raw=1#section>\n",
      "references/details file#?.md": "# Details\n",
    });
    const result = run(dir);
    assert.equal(result.status, 0, result.stderr);
  });
  await t.test("encoded nested missing path fails", (t) => {
    const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [guide](references/my%20guide.md).", {
      "references/my guide.md": "Read [details](missing%20file.md?raw=1#section).",
    });
    const result = run(dir);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /references\/my guide.md: missing local resource missing%20file.md/);
  });
  for (const target of ["references/bad%ZZ.md", "references/bad%E0%A4.md"]) {
    await t.test(target, (t) => {
      const result = run(fixture(t, "name: z-fixture\ndescription: Fixture", `Read [guide](${target}).`));
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /invalid local resource URI encoding/);
      assert.doesNotMatch(result.stderr, /URIError/);
    });
  }
});

test("resource directory links distinguish present and missing roots", async (t) => {
  await t.test("present directories", (t) => {
    const dir = fixture(t, "name: z-fixture\ndescription: Fixture", "Read [references](references/) and [assets](assets), or use [scripts](scripts/).", {
      "references/guide.md": "# Guide\n",
      "assets/template.md": "# Template\n",
      "scripts/check.sh": "exit 0\n",
    });
    const result = run(dir);
    assert.equal(result.status, 0, result.stderr);
  });
  await t.test("missing directory", (t) => {
    const result = run(fixture(t, "name: z-fixture\ndescription: Fixture", "Read [references](references/)."));
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /missing local resource references\//);
    assert.doesNotMatch(result.stderr, /leaves skill directory/);
  });
});
