# LienDeadline skills and plugins

This repository owns the shared supplier skill and client manifests. Keep unknown/review-required outcomes intact, caller keys out of tracked configuration, and local MCP release pins aligned across manifests.

## Local checks and delivery

1. Run checks locally from now on. Do not add or depend on GitHub Actions. Shared execution, locked tools, isolated environments and receipts belong to [LienDeadline Ops local CI](../liendeadline-ops/docs/local-ci.md).
2. Run `bash scripts/check-local.sh` from this root. It accepts `NODE_EXECUTABLE`, requires no dependency installation and runs the offline validator and its tests. [CONTRIBUTING.md](CONTRIBUTING.md) owns command details and former job coverage.
3. Complete the requested changes and local validation through the authorized delivery boundary. The website parity check is an explicit live operation, excluded from the default source gate. Publication, releases and authenticated acceptance require their own authorized scope.

## Code Review Rules

Flag only concrete published guidance or manifest paths that expose a caller key, bypass a review-required result, or route supplier facts through an incompatible contract. Authoring guidance alone is not a blocking finding. Avoid hypothetical and aesthetic findings; on re-review flag only new P0/P1 issues.
