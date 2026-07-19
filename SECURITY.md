# Security Policy

## Supported version

Security fixes are applied to the latest commit on `main` until formal releases are introduced.

## Reporting a vulnerability

Do not publish exploitable details in a public issue.

Send a private report to the repository owner through GitHub's private vulnerability reporting feature when it is enabled. Include:

- affected component and commit;
- clear reproduction steps;
- expected and observed behavior;
- realistic impact;
- proof-of-concept data that does not target real users or assets;
- suggested remediation, when available.

## Scope

High-priority reports include:

- TonConnect proof bypass;
- nonce replay or session theft;
- ownership or collection-validation bypass;
- unauthorized binding or revocation;
- database uniqueness or transaction failures;
- secret exposure;
- remote code execution;
- injection vulnerabilities;
- unsafe CORS or authentication behavior.

Out of scope:

- denial-of-service testing against production infrastructure;
- social engineering;
- attacks against third-party services without permission;
- reports based only on dependency version numbers without a reachable exploit path;
- public disclosure before a reasonable remediation period.

## Handling expectations

The project aims to acknowledge valid reports promptly, reproduce them safely, classify severity, prepare a fix and credit the reporter when requested. Exact response times are not guaranteed before a dedicated security team exists.

## Safe testing

Use local or test environments, wallets you control and non-production NFT collections. Never transfer, lock, burn or modify another person's assets while testing.
