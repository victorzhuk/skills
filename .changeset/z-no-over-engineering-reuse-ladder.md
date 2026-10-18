---
"victorzhuk-skills": minor
---

Add a reuse ladder and explicit safety boundaries to `z-no-over-engineering`. The skill now
prefers existing repository code, standard-library and native platform features, and installed
dependencies before writing new code, and names the validation, data-loss handling, security,
accessibility and test surface that a smaller diff may not shorten. Reuse guidance is adapted
from Ponytail (MIT), whose notice ships as the skill-local `LICENSE.ponytail`.
