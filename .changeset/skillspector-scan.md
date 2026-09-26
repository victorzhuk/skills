---
"victorzhuk-skills": patch
---

CI now scans every skill with NVIDIA SkillSpector (`npm run scan`) and fails on new HIGH or CRITICAL findings; reviewed false positives are baselined per skill in `.skillspector/`. `z-go-http-client` rewords one retry-pitfall sentence the scanner read as an exfiltration instruction.
