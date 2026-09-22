<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/ledgeroot-logo-dark.svg">
  <img src="assets/ledgeroot-logo-light.svg" alt="Ledgeroot" width="244">
</picture>

# Ledgeroot

### An MCP payment plugin and evidence engine for agent x402 payments

**Every agent payment, on the record.**

[![CI](https://github.com/ledgeroot/ledgeroot/actions/workflows/ci.yml/badge.svg)](https://github.com/ledgeroot/ledgeroot/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ledgeroot)](https://www.npmjs.com/package/ledgeroot)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![MCP](https://img.shields.io/badge/MCP-server-informational)
![x402](https://img.shields.io/badge/x402-payments-blueviolet)

**English** · [中文](./README.zh-CN.md)

</div>

---

## See it block a prompt-injected payment

```text
$ LEDGEROOT_DRY_RUN=true npm run demo

1  sign a mandate           → demo-mandate, issuer 0x19E7…ff2A
2  payment settles          → paid, 0.1 USDC to agent402.tools/search
3  retry, same requestId    → paid, deduplicated (no second charge)
4  prompt injection         → denied: payTo "0x…dead" is not bound by the mandate
5  one-click kill switch    → revoked 1 mandate
6  payment after revocation → denied: unknown mandate "demo-mandate"
7  offline verification     → verified, 3 receipts, 0 issues
```

> Abridged from a real run; steps 4 and 6 are the receipts' `reason` strings verbatim. **A denial is a receipt too** — steps 4 and 6 carry their own signed entries, which is why the ledger ends at three receipts and still verifies clean.

No wallet, no USDC, no network, no account. That is the whole loop: authorize → constrain → pay → deny → revoke → verify offline.

---

## Get started

### 1. Run the whole loop offline (60 seconds)

```bash
npm install
npm run build
LEDGEROOT_DRY_RUN=true npm run demo
```

### 2. Add it to Claude Code

```bash
claude mcp add ledgeroot \
  --env LEDGEROOT_PRIVATE_KEY=0xyour-private-key \
  --env LEDGEROOT_SIGNING_KEY=0xyour-receipt-signing-key \
  --env LEDGEROOT_DB=/absolute/path/ledgeroot.sqlite \
  -- npx ledgeroot serve
```

Then it is all conversation:

1. **Issue an authorization**: say "authorize it to spend 5 USDC on agent402.tools data" → Claude calls `ledgeroot_mandate_sign` → you confirm.
2. **The agent spends**: say "research X for me, buy the paid data" → the agent calls `ledgeroot_pay` → policies run → the facilitator settles → six-segment receipt.
3. **Revoke**: say "revoke its authorization" → `ledgeroot_mandate_revoke`.
4. **Audit**: say "verify the evidence" → `ledgeroot_verify`.

> Natural-language parsing is the host's job. Ledgeroot only exposes structured, deterministic tools; the private key is passed via `--env` and stays on the machine.

### CLI

```bash
node dist/cli.js verify [--db <path>] [--check-chain]   # offline verification (+ optional chain check)
node dist/cli.js export [--db <path>]                   # evidence bundle as JSON
node dist/cli.js anchor [--db <path>]                   # submit the epoch Merkle root on-chain
node dist/cli.js buy <url> --mandate <id> \
  [--method POST] [--body '<json>'] [--chain 143]        # fetch a URL, pay its 402, record the receipt
node dist/cli.js jwks                                   # the JWKS a third party needs
node dist/cli.js serve                                  # MCP server over stdio
```

### As a library

```ts
import { PolicyEngine, defaultPolicies, merkleProof, verifyMerkleProof } from "ledgeroot";
import { LedgerootStore } from "ledgeroot/store";
import { verifyReceiptChain } from "ledgeroot/verify";
```

Subpath exports: `ledgeroot` · `/store` · `/verify` · `/anchor` · `/receipt` · `/types`. The library **does not load `.env`** — the environment belongs to the caller (only the CLI and server entry points call `loadEnv()`).

### Real payment, and anchoring

```bash
# Monad testnet. Needs LEDGEROOT_PRIVATE_KEY and testnet USDC (Circle faucet).
npm run demo:pay -- <payTo address> 0.001
npm run verify -- --db ./ledgeroot.sqlite

# Anchor the epoch root (needs Foundry for the contract; forge-std is a git submodule)
forge install foundry-rs/forge-std && forge build && forge test
LEDGEROOT_DEPLOYER_PRIVATE_KEY=... npm run deploy:monad   # owner derives from LEDGEROOT_PRIVATE_KEY
npm run anchor -- --db ./ledgeroot.sqlite
```

---

## Buying a resource (the 402 flow)

`ledgeroot_pay` settles a payment whose quote the caller already holds — because the host did the 402 handshake somewhere else, where the audit trail cannot see it. `ledgeroot_buy` goes and gets the quote itself:

```text
1  fetch the resource      → 402 carrying the seller's requirements
2  pick a rail we can pay  → the one network this build registers
3  run every policy        → against *those* requirements, before signing
4  sign the authorization  → only if step 3 allowed it
5  retry with the payment  → the seller settles through its own facilitator
6  record the receipt      → quote in segment 3, settlement in 5,
                             the hash of the response body in segment 6
```

The gate sits at the **signing boundary**, the last point at which refusing is still free. A denial is recorded as a `denied` receipt **carrying the seller's own quote**, next to the verdict of every policy that ran — so a purchase blocked at a real seller is on the record, with its reason.

| Outcome | Meaning |
|---|---|
| `paid` | the seller accepted a payment; the receipt carries the settlement and the delivery hash |
| `denied` | policy refused, or the seller offers no rail this build can pay on. **Either way nothing was signed** and the attempt is recorded; the quote is empty when the seller never got as far as naming one |
| `unpaid` | the resource came back without a payment (a free tier, or a trial). **No receipt** — there is no payment to attest |

A failure *after* the gate — a transport error, or a seller that asks for payment again after one was offered — is **thrown rather than classified**, because whether it settled is unknown. The idempotency claim is kept, so a retry refuses instead of buying twice.

> 📌 The protocol half of this — read the 402, create the payload, retry, settle — is [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch). We register one rail and one gate on top of it. Re-implementing the handshake would only produce a second, worse copy, and the interesting question was never who can do the HTTP dance.

> ⚠️ **The sellers we buy from are mainnet-only.** agent402's live 402 offers `eip155:143` (Monad mainnet) among twelve chains, and **nothing on testnet**. `ledgeroot_buy` therefore defaults to `chainId: 143`, and a real purchase is a real — if tiny — payment.

---

## Why Ledgeroot?

- **Fail-closed by construction.** Every policy runs; the first denial stops the payment and is itself recorded. There is no path where a check is skipped and the payment proceeds.
- **Verifiable, not just logged.** Receipts are Ed25519-signed, hash-chained and committed to an epoch Merkle root on-chain. A third party verifies them offline — no call home, no vendor in the loop.
- **Denials are evidence.** A blocked attempt produces the same signed receipt a successful one does. That is the only place a blocked agent task is visible.
- **It buys, not just settles.** `ledgeroot_buy` fetches the resource itself, so the quote it judges is the one the seller actually sent, and segment 6 is the body it actually received.
- **One key moves money, another attests.** The signing key and the payment key deliberately do not fall back to each other.
- **Money never touches a float.** Six-decimal bigint arithmetic throughout.
- **Honest about what it does not know.** Missing evidence reports `incomplete`; it is never reported as tampering, and never waved through.
- **Audit trail proves execution, not just intent.** The consistency view re-checks paid receipts against the mandate that authorized them.
- **MIT, local SQLite, no SaaS, no telemetry.** Nothing leaves the machine.

---

## Where it sits

**Niche: on-chain stablecoins × agent micro-402 payments** (unit price $0.001–$0.05, on the order of a million payments a month).

The niche is guaranteed by **fee structure**, not by technical superiority: a $0.30 + 2.9% card fee spread across a $0.005 payment is 6000% — **physically impossible**. That is why x402 exists, and why we **don't do large-value payments**. Large payments come with invoices, contracts and refund flows, and that ground belongs to Shopify, Stripe, Visa TAP and Mastercard.

> ⚠️ Fee structure excludes anyone taking a **percentage**. It does not exclude a cloud vendor that bills by load and treats payment as a platform feature — see [competitors.md](./docs/competitors.md) §二.

Within that niche Ledgeroot does exactly three things:

| Does | Doesn't |
|---|---|
| **Authorization** — a user-signed mandate caps what the agent may spend, to whom, and until when | ❌ **No custody** — the private key never leaves the machine |
| **Pre-execution checks** — a fail-closed policy engine with five default policies | ❌ **No router or discovery layer** — that layer is already taken |
| **Audit trail** — six-segment receipts + hash chain + on-chain anchoring + offline tri-state verification | ❌ **No LLM inference gate** — determinism is precisely our advantage |

> 📌 At this granularity a **receipt is not the product** (a ten-thousandth of $0.005) — it is **raw material**. Only the layer that turns receipts into a **ledger** can be charged for. That positioning does **not** lower the bar on the receipt engineering: the layer above can only be trusted if every receipt beneath it verifies independently.

### Aligned with MAS SAFR

Ledgeroot's three layers map one-to-one onto the three runtime safeguards in MAS's *Safeguards for Agentic Finance at Runtime* — **we implemented the same architecture independently, before seeing that document**:

| SAFR safeguard | Ledgeroot |
|---|---|
| establish agent's identity and authority | mandate (EIP-712 signed authorization) + `ledgeroot_mandate_sign` |
| evaluate agent actions against controls before execution | policy engine (fail-closed, five default policies) + the pre-check inside `ledgeroot_pay` |
| maintain a clear audit record | six-segment receipts + RFC 8785 hash chain + epoch Merkle root on-chain + offline tri-state `ledgeroot_verify` |

> SAFR is a voluntary framework (published 2026-07-03); what will actually bind is MAS's forthcoming AI risk-management guidance covering agentic AI. Both are worth aligning with — so we implement SAFR's three layers now.

### Works with

- **Any MCP host** — Claude Code, opencode, and anything else that speaks MCP (this is the only integration surface we maintain).
- **x402 gateways** — including those discoverable through Coinbase's Bazaar.
- **Monad testnet today** — chainId 10143, with the x402 facilitator at `x402-facilitator.molandak.org`. Other chains are a config instance away, not a rewrite; see [Known limits](#known-limits).
- **AP2-style mandates** — import an externally signed authorization and intersect it with local policy.

---

## The six-segment receipt

`intent → mandate → plan → call → transaction → delivery`

| Segment | What goes in | Where it lands |
|---|---|---|
| 1. **Intent** | a natural-language statement of why the agent is paying | `segments.intent.text` |
| 2. **Mandate** | the authorization covering this payment + the **policy intersection** (which policies the mandate actually constrained) | `segments.mandate` |
| 3. **Plan** | the 402 quote **exactly as the seller sent it**, plus its canonical hash — `payTo` and the quoted amount are read from here, so what policy judged is what the receipt records | `segments.plan` |
| 4. **Call** | **the verdict of every policy**, both the passing and the denying ones | `segments.call.policyResults` |
| 5. **Transaction** | settlement protocol + `txHash` + `chainId` + `payer` | `segments.tx` |
| 6. **Delivery** | **the hash and byte size** of the response body — never the body itself | `segments.delivery` |

A few things are deliberate:

- **Segments are interlocked by RFC 8785 canonical hashing.** Each receipt carries a `prevHash` pointing back at the previous receipt's `receiptHash`. The log is append-only and cannot be updated in place — a receipt's `id` *is* the canonical hash of its content, so changing one byte makes it a different receipt.
- **Every receipt carries a detached Ed25519 signature** with a JWS-style `protected` header. The signature covers `{payload, protected}`, so `alg` and `kid` sit **inside the signed bytes** and cannot be swapped after the fact. `kid` is the public key's **RFC 7638 JWK thumbprint** — the identifier is derived from the key itself, so it needs no registry and cannot drift away from the key.
- **The hash chain proves the content was not changed; the signature proves who made the statement.** They are independent: tamper with the content and re-hash it, and the chain still verifies — only the signature catches it.
- Public keys are published as **JWKS** (`npx ledgeroot jwks`) and shipped inside the evidence bundle, so a third party can verify signatures **without calling home**.
- **Segment 6 can only be reported by the caller** (`responseBody` on `ledgeroot_pay`). Ledgeroot settles the payment but **never fetches the resource** — only the agent sees the response body, so only the caller can supply its hash.
- **Segment 3 is checkable, not just descriptive.** The quote is stored whole and committed to by hash, so a verifier recomputes `canonicalHash(segments.plan.quote)` and compares. A quote swapped after signing fails that check even if the receipt is re-hashed and re-signed — which is exactly the edit an issuer could otherwise make quietly. `payTo` and the quoted amount come from the same object, so a caller cannot pass a benign `payTo` alongside a quote pointing somewhere else.

### The signing key is separate from the payment key

| Variable | Job | If unset |
|---|---|---|
| `LEDGEROOT_PRIVATE_KEY` | **Moves money**: signs EIP-3009 authorizations and submits anchor transactions | cannot pay |
| `LEDGEROOT_SIGNING_KEY` | **Only makes statements**: signs receipts | **receipts are unsigned → `verify` reports `incomplete`, not `verified`** |

They deliberately **do not fall back to each other**: one key moves money, the other attests to what happened, and neither can do the other's job. Evidence that cannot be attributed should not read as `verified`.

---

## Tri-state verification (offline first)

Verification **depends on no server** — `ledgeroot verify` reads the local database and recomputes.

| Status | Meaning |
|---|---|
| `verified` | every check passed |
| `tampered` | **bytes were checked and do not match** — self-hash mismatch / broken `prevHash` link / a first receipt carrying `prevHash` / `plan.quoteHash` not committing to the recorded quote / recomputed epoch root ≠ anchored root / receipts missing from an anchored epoch / signature mismatch / unsupported `alg` |
| `incomplete` | **evidence is missing or unobtainable** — unsigned / no public key for that `kid` / a paid receipt with no `txHash` / an anchor with no boundary / unknown settlement protocol / unreachable node |

**This boundary is the single most important discipline in the product**: `tampered` outranks `incomplete`, and **unobtainable evidence is never reported as tampering**. Reporting a network failure as tampering would destroy the credibility of the whole alarm; conversely, treating missing evidence as a pass would claim a check that never ran.

**On-chain settlement checking is opt-in** (`--check-chain` / `checkChain: true`): the offline path stays synchronous and network-free; only the chain check reaches for RPC.

| On-chain check verdicts |
|---|
| transaction not found → `tampered` (there is no such payment on chain) |
| **node unreachable → `incomplete`** (cannot read ≠ does not exist) |
| transaction reverted / `to` is not the USDC contract / the call is not a `transferWithAuthorization` / `to`·`value`·`from` disagree with the receipt's payTo·amount·payer → `tampered` |
| a non-x402 settlement protocol → `incomplete` (see [Known limits](#known-limits)) |

**Anchor boundaries**: an epoch root covers "the receipts that existed at submission time" (`receiptCount`). Verification slices back to that boundary before recomputing, so **payments made after an anchor do not read as tampering**; conversely, fewer receipts present than the recorded count → `tampered` (that is a deletion).

---

## The five default policies (fail-closed)

Each attack shape has the policy that catches it:

1. **Counterparty whitelist** — only pay x402 gateways listed in the mandate
2. **payTo binding** — the settlement address must match the mandate (**this is the one that stops the prompt-injected transfer in the demo above**)
3. **Quote drift** — the amount charged may not drift from the 402 quote beyond a threshold (10% by default)
4. **Endpoint rate limit** — cap call frequency per endpoint
5. **Amount limits** — a per-payment ceiling plus a cumulative ceiling

**What the constraints mean**: an empty whitelist or an empty `payTo` list means **unconstrained**, not deny-everything; rate limiting only applies when the mandate sets `endpointRateLimit`; the two amount limits always apply. `ledgeroot_mandate_import` **intersects** the mandate's constraints with the policies registered locally and records that intersection in segment 2.

The engine runs **every** policy and records every verdict, returning the first denial. Amounts always go through `decimal.ts` — **bigint arithmetic over six-decimal units**; money never touches a float.

**Of these, the ones a chain cannot express are quote drift, endpoint rate limits, cumulative ceilings (structuring) and the denial record.** A chain knows addresses, not hosts or quotes, and does not record "attempts that were blocked". That is the reason this layer exists.

---

## Idempotency, the crash window, and task grouping

The x402 rail and the local database **are not one transaction**. Ledgeroot closes the gap with two optional correlation keys:

### `requestId` — idempotency, claimed **before the money moves**

The naive version ("write the receipt after settling, dedupe by looking up receipts on retry") has a fatal window: if the process dies **after settlement but before the receipt is on disk**, the money moved, nothing was recorded, and `requestId` finds nothing — so the retry **pays a second time**. That loses both the evidence and the money, which is exactly what the product claims to prevent.

So `requestId` is consumed **at attempt time**, not at success time:

| Step | Action |
|---|---|
| 1 | an existing receipt matches → **replay it** (`deduplicated: true`), no second charge |
| 2 | after policies allow, **before the money moves**: claim the id in the out-of-chain `payment_intents` table |
| 3 | **claim fails** (the key is taken, meaning an earlier attempt's outcome was never recorded) → **deny**, and write a `denied` receipt |
| 4 | settle → write the receipt → release the claim |

**Why a failed claim must deny rather than retry**: that row means "**we do not know whether that payment settled**". Refusing to spend is recoverable; paying twice is not.

> ⚠️ The pre-write record **can only live outside the chain**: a receipt's `id` is its content hash, so flipping `status` from `pending` to `paid` changes the hash, and the next receipt's `prevHash` would point at a hash that no longer exists. The log is append-only — in-place updates are structurally impossible.
>
> ⚠️ **Pass no `requestId` and you get none of this protection** — there is nothing to key the attempt on. Idempotency has to be asked for.

### `taskId` — the intent chain

Groups several payments under one user task; the dashboard aggregates them as "N payments / total / N blocked".

### Revocation

`ledgeroot_mandate_revoke` revokes a single mandate; the store also exposes a **one-click kill switch** (`revokeAllMandates`) for control planes to call. The next payment after revocation is denied **and recorded**.

---

## Known limits

The honest section. These are limits of the **current implementation**, not a repudiation of the design intent; the ordering and trade-offs are recorded in [roadmap.md](./docs/roadmap.md).

| Limit | Current state |
|---|---|
| **The pay path is still testnet-only** | `X402_NETWORKS` holds two instances (Monad testnet 10143, mainnet 143) and `ledgeroot_buy` chooses between them by `chainId`. **`ledgeroot_pay` does not**: `bootstrap.ts` still hands the facilitator `MONAD_TESTNET_X402` unconditionally, with no environment variable able to move it |
| **A mainnet purchase cannot be chain-checked yet** | `USDC_BY_CHAIN` knows Monad testnet's USDC only, so `--check-chain` on a mainnet receipt reports `incomplete`. The missing piece is per-chain RPC configuration, deliberately absent rather than defaulted: one RPC URL asked about another chain's transaction would report a false `tampered` |
| **MPP is a seam, not an implementation** | `segments.tx.protocol` is an explicit dimension: **an unknown protocol reports `incomplete`** — neither waved through nor wrongly accused. But MPP's field-level shape is undecided, so no payload shape is assumed and no provider exists. Tracked as the top item in the [roadmap](./docs/roadmap.md) |
| **No indexes on the hot path** | There is not a single `CREATE INDEX` in the codebase: each payment does 4 unindexed full-table scans, two of which also `JSON.parse` the entire match set. O(n) per payment, O(n²) per month |
| **Single process, single tenant** | One database, one signing key, one payment key. There is no tenant boundary in the data model — `agentId` / `mandateId` are not isolation keys |
| **Testnet anchoring produces no evidentiary value** | A testnet block time is not an external authority. Mainnet, or an RFC 3161 qualified timestamp, is the follow-up |
| **Inclusion proofs are library-only** | `merkleProof` / `verifyMerkleProof` (RFC 6962 §2.1.3 audit paths) are implemented and cross-checked by tests, but **this repo's CLI and `ledgeroot_verify` do not yet emit or verify per-receipt proofs**; the wiring lives in the [MandateKey](https://github.com/ledgeroot/mandatekey) evidence bundle |
| **Third-party verification still goes through the bundle** | A standalone verifier package (zero-dependency, single file, runs offline) has not shipped; to verify a single receipt today, a third party needs the exported evidence bundle (which carries the public keys) or this library |
| **Verification is full-scan** | `verify` walks every receipt recomputing SHA-256 + Ed25519 on each run — no incremental mode, no checkpoint. `--check-chain` puts no cap on RPC concurrency |
| **Contract tests are not in CI** | `.github/workflows/ci.yml` runs typecheck, the 114 TypeScript tests and the build. `forge test` for `LedgerootAnchor.sol` still runs locally only |
| **No aggregation layer** | There is not one SQL aggregate in the codebase (no `GROUP BY` / `SUM` / `COUNT`) and no reconciliation export. This is the only chargeable layer in the niche, and it does **not exist at all** |
| **ERC-8004 is a field, not an integration** | `Mandate.agentId` exists but is not validated against a registry |

---

## The anchor contract

`contracts/src/LedgerootAnchor.sol` — the only contract in the project, storing **a 32-byte root, a back-pointer and an epoch counter**, and nothing else.

- **Owner-gated**: `anchor()` is `onlyOwner`. An open `anchor()` reduces "this root is on chain" to "somebody anchored something here" — an attacker could publish a forged root, or displace the honest one so valid receipts verify as `tampered`. The owner is the **anchoring wallet** (derived from `LEDGEROOT_PRIVATE_KEY`), not the deployer, so the two keys can be separated.
- **The contract owns the epoch**: `lastEpoch` increments on every anchor, and clients read it from the contract instead of counting locally — otherwise a fresh database would label its first anchor "epoch 1" no matter how far the contract has already run.
- **RFC 6962 MTH for Merkle**: leaves are `SHA-256(0x00 ‖ d)`, internal nodes `SHA-256(0x01 ‖ L ‖ R)`, split at the largest power of two below n (no duplicating an odd trailing node). **Domain separation** is what buys second-preimage resistance. Tests cross-check against the stack-based algorithm in RFC 9162 §2.1.2 as an independent oracle.
- Deployed to Monad testnet (chainId 10143). One deployment used for demos: `0xc0234ea7e3af77e5ae686caff62ff88eaccd8c30` (owner `0x055A…A8f7`) — **a testnet address that may be redeployed at any time; trust your own `.env`**.

---

## The eleven `ledgeroot_*` tools

| Tool | What it does |
|---|---|
| `ledgeroot_buy` | **Fetch a URL and pay the 402 it answers with.** Every policy runs before the payment is signed; the response body is hashed into segment 6 |
| `ledgeroot_pay` | Constrained x402 payment (idempotent dedupe + task grouping), producing a six-segment receipt; pass the seller's `quote` and the receipt commits to it, and `responseBody` to have segment 6 cover delivery |
| `ledgeroot_mandate_sign` | Sign an authorization with the local key on the spot (`id` is optional and auto-generated) |
| `ledgeroot_mandate_import` | Import an AP2-style authorization (**a failed signature check is an outright rejection**) |
| `ledgeroot_mandate_list` | List active authorizations |
| `ledgeroot_mandate_revoke` | Revoke one authorization (the one-click kill switch) |
| `ledgeroot_receipt_list` | List receipts (filter by mandate / status / endpoint) |
| `ledgeroot_receipt_get` | Fetch a single receipt |
| `ledgeroot_verify` | Offline verification of the evidence chain + anchor; `checkChain` additionally confirms settlements against the chain |
| `ledgeroot_anchor` | Submit the epoch Merkle root on-chain |
| `ledgeroot_export` | Export the evidence bundle (receipts + root + anchor record + public keys + verification verdict) |

---

## Environment variables

| Variable | Meaning |
|---|---|
| `LEDGEROOT_DB` | SQLite database path (defaults to `ledgeroot.sqlite`) |
| `LEDGEROOT_PRIVATE_KEY` | The key that **moves money**: payment signing + anchor submission. Never leaves the machine |
| `LEDGEROOT_SIGNING_KEY` | The **receipt signing** key (32-byte hex seed), deliberately separate from the payment key. **If unset, receipts are unsigned and verification reports `incomplete`** |
| `LEDGEROOT_FACILITATOR_URL` | Monad x402 facilitator endpoint (defaults to `https://x402-facilitator.molandak.org` — public, no API key) |
| `LEDGEROOT_RPC_URL` | Monad testnet RPC (defaults to `https://testnet-rpc.monad.xyz`) |
| `LEDGEROOT_ANCHOR_ADDRESS` | Anchor contract address (anchoring is unavailable without it) |
| `LEDGEROOT_DEPLOYER_PRIVATE_KEY` | Used only by `deploy/monad.ts`; the contract owner derives from `LEDGEROOT_PRIVATE_KEY` |
| `LEDGEROOT_ANCHOR_BYTECODE` | Bytecode for deployment; falls back to the `forge build` artifact |
| `LEDGEROOT_DRY_RUN` | `true` enables simulation: the full loop with no wallet and no USDC (fake transactions, throwaway key — **never for real payments**) |

---

## Repository layout

```
src/
  policy/        policy engine + the five default policies + Zod schemas
  receipt/       six-segment receipt builder + RFC 8785 hash chain + Ed25519 signing (JWKS / thumbprint kid)
  anchor/        RFC 6962 Merkle (root / inclusion proofs) + anchorer (viem)
  verify/        offline tri-state verifier + on-chain settlement content checks (ERC-3009 decoding)
  store/         SQLite append-only store (receipts / mandates / anchors / payment_intents)
  x402/          facilitator integration (EIP-3009 authorization + /verify + /settle) + the buyer (@x402/fetch with our policy gate at the signing boundary)
  tools/         the eleven ledgeroot_* MCP tools
  mandate.ts     EIP-712 authorization (sign / verify / policy intersection)
  consistency.ts post-hoc authorization-vs-execution analysis (did any paid receipt exceed its mandate)
  decimal.ts     USDC six-decimal bigint arithmetic, no floating point
  env.ts         environment loading + the dry-run switch
  cli.ts         verify / export / anchor / jwks / serve
scripts/         demo (dry-run, full loop) / pay-demo (real payment) / deploy
contracts/       LedgerootAnchor (Solidity 0.8.24 + Foundry)
deploy/          Monad testnet deployment config
docs/            architecture review / roadmap / competitor and standards research / commercialization
assets/          logo lockups (light + dark)
test/            114 tests across 13 files
```

---

## Contributing

Small, well-scoped changes are the easiest to land, and the roadmap is the best place to find one:

- **[Roadmap](./docs/roadmap.md)** — the ordered plan, with acceptance criteria and affected files per item.
- **[Known limits](#known-limits)** — every item there is a real, bounded piece of work.
- **Run the suite before opening a PR**: `npm run typecheck && npm test && npm run build` (this is exactly what CI runs).

New to the codebase? `scripts/demo.ts` walks the whole loop in one file, and `test/pay.test.ts` covers the crash-window behaviour end to end.

---

## Design and research documents

> 📌 These documents are written in Chinese; there are no English versions yet.

| Document | Contents |
|---|---|
| [README.md](./docs/README.md) | Index and reading order for the whole doc set |
| [architecture.md](./docs/architecture.md) | Source-level architecture review: what is done right, scaling debt, the zero-export vs aggregation tension, chain config and the protocol seam |
| [roadmap.md](./docs/roadmap.md) | The action plan: P0 correctness (closed) → P1 differentiation → P2 visibility → P3 credibility; gap list N1–N15 and open decisions Q1–Q17 |
| [commercialization.md](./docs/commercialization.md) | The niche, four trade-offs, the commercial layering, and what we must **not** do now |
| [landscape.md](./docs/landscape.md) | Threat taxonomy (carriers / distribution monopolists / direct competitors / the regulatory clock), commoditisation half-lives, and the monitoring triggers |
| [competitors.md](./docs/competitors.md) | Deep dives on Vaara, AWS AgentCore payments, TrustBench, and Semantica (adjacent) |
| [standards.md](./docs/standards.md) | Academic and standards landscape: OAP, Vaara Receipt, the IETF drafts, and the case for supporting x402 and MPP side by side |
| [tokenized-equities.md](./docs/tokenized-equities.md) | The second vertical — Uniswap permissioned pools × tokenized equities — and the two SEC proposal tracks |
| [sec-comment-s7-2026-30.md](./docs/sec-comment-s7-2026-30.md) | Draft comment letter on SEC File S7-2026-30 (marked DRAFT; not to be filed as-is) |

---

## License

MIT © 2026 Ledgeroot

<div align="center">

### The industry built the locks, but nobody built the keyring. It built the brakes, but nobody built the black box.

**[Verify it yourself — don't take our word for it.](#get-started)**

⭐ **[Star it](https://github.com/ledgeroot/ledgeroot)** · 📖 **[中文 README](./README.zh-CN.md)** · 🗺️ **[Roadmap](./docs/roadmap.md)** · 🛡️ **[Landscape](./docs/landscape.md)**

<sub>MIT · no SaaS · no telemetry · the private key never leaves the machine</sub>

</div>
