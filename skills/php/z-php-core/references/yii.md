# Yii2

Most Yii2 work is maintaining an app someone else wrote years ago, not greenfield development. Assume inherited code, mixed conventions, and thin or absent tests until proven otherwise.

## Support status

Yii2 has no fixed end-of-life date — the project's stated policy ties Yii2 support to five years past Yii3's official release, not a calendar cutoff. Yii 1.1 (the older branch) has its own separate, extended support timeline. Don't state a specific Yii2 EOL date without checking the current release-cycle page (`yiiframework.com/release-cycle`) or find-docs first — the policy has been discussed for revision and a stale date is worse than none.

## ActiveRecord patterns

- `ActiveRecord::find()` and query methods return the model itself for chaining — same N+1 risk as any ORM: `with('relation')` eager-loads, a bare `foreach` over a collection followed by `->relatedModel` access without `with()` fires one query per row.
- Validation rules live in the model's `rules()` method, keyed by scenario — see the scenario section below before touching an existing `rules()` array, its conditions are often load-bearing for behavior you can't see from the method alone.
- Business logic creeps into AR models over time in inherited apps (`save()` overridden with side effects, static methods doing orchestration). Don't add more of it — new logic goes in a service/component, even if the surrounding model doesn't already separate it.

## Modules

- A module (`yii\base\Module`) bundles controllers/models/views/config for a self-contained feature area, registered in the app config's `modules` array. Inherited apps often have modules as a soft admin/API/frontend split rather than genuine bounded contexts — don't assume a module boundary implies a clean domain boundary until you've checked what actually lives inside it.
- New functionality doesn't need a new module by default — only introduce one when the app's existing structure already uses modules as its organizing unit and the feature area genuinely warrants isolation.

## Migrations

- `yii migrate` runs numbered migration classes (`m<timestamp>_<description>`) with `up()`/`down()`. Same rule as any framework: migrations are the only path to schema change, never a manual `ALTER TABLE` against a live database.
- Check for a `down()` implementation before relying on rollback — inherited migrations frequently leave `down()` unimplemented or throwing, silently removing the safety net.

## Gii codegen

- Gii scaffolds CRUD, models, and modules from the database schema. Useful for a first draft or a genuinely new table; regenerating over a model that's since accumulated custom logic will silently discard it unless Gii's diff/merge is reviewed line by line.
- Treat Gii output as a starting point to review and integrate, not a source of truth to keep re-running against a hand-modified file.

## DI container

- `Yii::$container` resolves dependencies by convention/config, closer to a service locator than the autowired container Symfony or Laravel ship — set explicit definitions (`Yii::$container->set(...)`) for anything the default convention can't resolve.
- Inherited apps often skip the container entirely and `new` up dependencies directly in constructors or `Yii::createObject()` ad hoc. Don't refactor an entire subsystem to introduce DI as a drive-by change — that's a deliberate modernization step (see below), not a bug fix.

## Common legacy hazards

- **Fat controllers**: business logic inline in `actionX()` methods instead of delegated to a service/component. Treat as a code smell to flag, not necessarily to fix immediately — extracting logic out of a controller with no tests around it risks silently changing behavior.
- **Scenario-based validation confusion**: `rules()` conditioned on `$this->scenario`, with scenarios set implicitly by the framework (e.g. `SCENARIO_DEFAULT`) or explicitly by calling code. A rule that looks dead is often scenario-gated — check every `on => [...]`/`except => [...]` clause before assuming a validation rule doesn't apply.
- **Untyped, undocumented array config**: nested associative arrays for app/component config with no schema beyond convention. Read the actual `Yii::$app` config, don't infer behavior from a partial view of one config file — component config is frequently split across environment files.

## Safe modernization path

Don't attempt a big-bang rewrite of an inherited Yii2 app. Land improvements incrementally, in this order:

1. Add a PHPStan baseline (`phpstan-baseline.neon`) against current code so new violations are visible without demanding the whole app pass level 8+ on day one.
2. Add tests around the specific area before refactoring it — characterization tests that lock in current behavior, even if that behavior is a known bug, so a refactor can be verified against them.
3. Refactor in small, reviewable steps with tests as the safety net, not as a follow-up "add tests later" promise.
4. Only after the above is real: consider introducing typed properties, extracting fat controllers, or wiring `Yii::$container` more thoroughly.
