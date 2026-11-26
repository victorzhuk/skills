---
name: z-just
description: "Discover and run casey/just recipes. Use for justfile edits, recipe dependencies, working directories, and shell quoting. See [[z-go-makefile]] and [[z-go-taskfile]] for Go build wrappers."
---

# Run project commands with just

## Use an existing justfile

1. Locate the intended `justfile` or `.justfile`. From a subdirectory, `just` searches parent directories.
2. List public recipes and parameters with `just --list`. Select a specific file with `just --justfile PATH --list`.
3. Inspect the selected recipe with `just --show RECIPE`. Inspect each unfamiliar dependency separately.
4. Run `just RECIPE` with its declared arguments. Bare `just` normally runs the first recipe.
5. Resolve relative paths from the justfile's directory unless the recipe overrides its working directory.
6. If syntax differs, compare `just --version` with the project's pin.

## Write a recipe

Wrap the project's existing command or script. Delegate timestamp checks and incremental builds to the underlying build tool.
Put a comment above each public recipe to explain its purpose in `just --list`.

This POSIX shell example counts lines in a file. The default parameter lets `just lines` count the justfile itself.

```just
# Count lines in a project file.
lines $file='justfile':
    @wc -l < "$file"
```

The `$` in the signature exports the parameter. Quoting `"$file"` in the shell preserves spaces and quotes in the filename.
Avoid inserting caller input into shell code with `{{file}}`. Interpolation happens before the shell parses the command.

- Declare prerequisites in the recipe header, for example `check: lint test`. A shared prerequisite with identical arguments runs once per invocation.
- Ordinary recipe lines run in separate shells. Use a shebang recipe when several lines must share a directory or shell variables.
- Match the shell to the project's supported platforms. Select an interpreter explicitly when a recipe needs shell-specific syntax.

## Check the recipe

List the recipes. Check the changed signature and description. Run the recipe with representative arguments. Check its output and exit status.
For the example, pass a file with spaces in its name and a known line count. A missing file must produce a nonzero exit status.

Consult the [Just Programmer's Manual](https://just.systems/man/en/) for syntax and version requirements.
