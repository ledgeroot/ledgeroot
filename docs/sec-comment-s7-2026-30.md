# Comment on SEC File No. S7-2026-30 — Draft

> **STATUS: DRAFT. Do not file as-is.**
> Before filing, complete §I (Commenter) and decide the signature question (see `docs/tokenized-equities-opportunity-map.md` Q14). The comment and everything in it becomes a public, permanently attributable U.S. government record.
>
> **Filing mechanics (verified 2026-09-18):**
> - File No. **S7-2026-30** · Release No. **34-106246** · RIN 3235-AL55
> - Comments due **November 3, 2026**
> - Submit: https://www.sec.gov/comments/s7-2026-30/transfer-agent-rules
> - Read the file: https://www.sec.gov/rules-regulations/public-comments/s7-2026-30
>
> **Differentiation note (not part of the letter):** 18 comments were on file as of Sept. 15. The two substantive industry letters — Vertalo, Inc. (Sept. 6) and Equity Stock Transfer, LLC / BlockAgent, Inc. (Sept. 14) — both answer the immutability question by asserting that immutability is straightforwardly a virtue for recordkeeping. This draft takes the position that it is a virtue for the **record of what happened** and a **liability for the personal-data payload**, and it names three reconciliations the Commission has not yet been asked to make. It also raises the "ledger as the file itself" privacy case, which neither letter reaches.

---

November 2, 2026

Vanessa A. Countryman, Secretary
U.S. Securities and Exchange Commission
100 F Street NE
Washington, DC 20549-1090

**Re: Transfer Agent Rules; Release No. 34-106246; File No. S7-2026-30; RIN 3235-AL55**

Dear Ms. Countryman:

I write in response to the Commission's request for comment on the proposed modernization of the rules governing registered transfer agents. I limit these comments to a single cluster of questions — those concerning records maintained on a distributed ledger, and principally Request for Comments 100 and 105 and the related questions at 50, 83, 84, 97–99 — where I believe the record so far is incomplete in a way that will matter at adoption.

I have read the letters of Vertalo, Inc. and of Equity Stock Transfer, LLC and BlockAgent, Inc. I agree with much of what they say, and I say so below. But both letters answer the immutability question by treating immutability as straightforwardly a virtue. I think that is right for the record of what happened and wrong for the personal data a register necessarily contains, and that the Commission should separate the two before it adopts a retention rule that does not.

---

## I. Interest of the commenter

> **[TO BE COMPLETED BEFORE FILING.]** State plainly who you are and why the comment is worth reading. Suggested substance, to be written in your own words and verified as accurate:
>
> - You are a technical contributor working on verifiable recordkeeping for regulated assets; describe concretely (proofs of completeness, offline third-party verification, anchoring).
> - **State expressly whether you are or are not a registered transfer agent.** Do not imply registration. If you are not one, say so — the Commission weighs a technical submission differently, and a false or ambiguous claim here would poison the letter.
> - If you have implemented anything described below, say where it can be inspected. Under-claiming is more persuasive than over-claiming; the letters in this file that will age best are the ones that mark what they have not demonstrated.

---

## II. Summary of positions

1. **The durability the Commission should require is the durability of the commitment, not of the payload.** An append-only record that commits to every entry — and can prove it never omitted one — satisfies the recordkeeping purpose. Retaining the personal data in perpetuity does not, and is in tension with the six-year period the proposal itself sets.

2. **If a distributed ledger is the master securityholder file, the position detail it holds is personal data.** Neither the release nor any comment filed so far addresses how a full name and a physical mailing address can lawfully constitute a public, replicated, permanent record. The Commission should address it expressly rather than leave it to registrants.

3. **"At least six years" has no outside boundary, and immutability makes that a live question.** The Commission should say whether retention beyond the required period is permitted, expected, or a data-minimization concern.

4. **Correction by compensating entry is the right mechanism, but it repairs the balance and not the disclosure.** Where an erroneous entry mis-associated a named person with an address, the correcting entry does not undo the harm; the design must make the underlying payload removable without breaking the proof of completeness.

5. **The "duplicate register" question should be answered by asking which record is authoritative, not by counting copies.** So framed, the Commission can confirm that a non-authoritative retention extract is permissible without reopening the two-records problem.

---

## III. Retain the commitment, minimize the payload

### A. The two things a register must do are separable

A master securityholder file must establish, for any past date and for any holder, what that holder held, and it must establish that the list is complete — that no entry was removed. These are different properties and they can be carried by different artifacts:

| Property | Carried by | Must be permanent? |
|---|---|---|
| **Completeness** — nothing was omitted or removed | an append-only sequence of commitments, with each entry chained to its predecessor and the sequence's root published | **Yes** |
| **Content** — who held what, and who they are | a controlled record of position detail | **No** — and in part it must not be |

Proposed Rule 17ad-7(f)(2) already reaches for the first set of properties, requiring controls for integrity, accessibility, reproducibility, redundancy, continuity, and audit trails, including the ability to recover altered, damaged, or lost records. What the rules do not yet distinguish is that *integrity of the sequence* and *retention of the payload* are different obligations that can and sometimes must come apart.

### B. Why the payload must be separable

The proposal requires position detail to include a registered holder's full name, information sufficient to identify the holder to the exclusion of all others, and a physical mailing address. That is personal data. Under the proposal, most records must be retained at least six years. Three consequences follow that the current record does not engage:

- **A six-year retention period implies that six years is the horizon of necessity.** An immutable ledger retains by construction. "Not less than six years" plus "cannot be deleted" yields "forever." The Commission should state whether perpetual retention satisfies the rule, or exceeds it. Neither letter in this file asks.

- **Other law can require removal.** Where a record must be expunged — because a position was recorded against the wrong person, because a disclosure is subject to a protective order, because a state privacy regime compels erasure, or because the holder is a protected person — a design in which deletion is *impossible* is not a superior compliance posture. It is a design that cannot be made compliant.

- **The error itself can be the harm.** Compensating entries correct balances. They do not correct the fact that a named individual's identity was, for a period, associated with an address or a position that was never theirs. That association is the injury, and re-crediting the shares does not cure it.

### C. A design that satisfies both

The two obligations can be discharged together, and the mechanism is not exotic:

1. The append-only record carries, for each entry, an ordinal, a time reference, the event type, the authority under which the entry was made, and a **commitment** to the entry — not the personal data in cleartext.
2. The commitment is computed over the entry's payload **under a per-entry salt**. The salt is held in the controlled record, not in the append-only one.
3. On lawful deletion, the payload and the salt are destroyed. The commitment and its position in the chain remain.

The resulting property is the one that matters: **the register can still prove that an entry existed, was recorded in sequence, and was never omitted — while no longer being able to read it.** The proof does not depend on retaining the data, and the data does not survive to be misused. A salted commitment also resists the obvious objection to immutable registers of personal data — that a plain hash of a predictable record (a name and an address) can be re-identified by anyone who can enumerate candidates.

I do not suggest the Commission mandate a mechanism. I ask that it (i) confirm that the completeness obligation and the payload-retention obligation are separable, so that a registrant may satisfy the first without perpetual retention of the second, and (ii) not adopt language that makes an inability to delete a condition of using a ledger.

---

## IV. If the ledger is the file, the Commission should address the personal data directly

Proposed Rule 17ad-9(b) contemplates a distributed ledger as the master securityholder file "or a component thereof." The two industry letters in this file describe architectures in which the ledger is a **component** — the off-chain record is the file, and wallet addresses, quantities, and restrictions are written onchain. That is a coherent architecture.

The case the release opens and no comment has addressed is the ledger as **the file itself**. If position detail — a full name, a physical mailing address, and information identifying the holder to the exclusion of all others — must be part of the file, and the file is a replicated public ledger, then the Commission has required the public disclosure of every shareholder's identity and address, permanently. That cannot be the intended result, and it is not cured by permissioned access alone: a permissioned network whose participants are known and contractable remains a set of parties among whom the register circulates, and the proposal simultaneously asks whether viewing records on a blockchain *constitutes independent access* for the transfer agent's own compliance — which, if answered affirmatively, implies a reading population beyond the registrant.

The Commission should state one of the following, and not leave the question open:

- that the position detail of a security whose master securityholder file is a distributed ledger may be maintained as a commitment on the ledger, with the payload held in a controlled record that is part of the file, so that the ledger is the authoritative record **of the sequence** and not a publication of the holders; or
- that a public, permissionless ledger may not itself constitute the master securityholder file or the component carrying position detail, and the release's statement to the contrary is subject to that limit.

Either answer is workable. Silence is not, because the industry is reading the release's permissive language as an invitation, and the first issuer-sponsored register placed on a public chain will set the expectation.

---

## V. Wallet-to-holder associations should be committed, not published

Both industry letters correctly identify the wallet-to-holder association as the join between the onchain and offchain records. Vertalo asks the Commission to require the association to carry effective dating, because a record of a deletion dated by date of deletion does not tell an examiner who held a wallet on a given past date. I support that request.

But the association is also the sharpest privacy question in the proposal, and no comment raises it.

The proposal asks whether a wallet address may become the primary identifier for tokenized securities. Suppose it is. Positions and addresses are then written onchain. Holder identity binds to the address offchain. The binding, once made, is durable — and if the association history is itself published, the register becomes a permanent public map from named individuals to addresses, retained past the point of any necessity and past the point at which the holder can do anything about it. An address can be rotated; a chain cannot. The old binding persists indefinitely, and with it the exposure of a holder who has since moved, been compromised, or simply wishes not to be searchable.

The association is exactly the kind of record that should be **committed and dated, not published**: present in the sequence as an entry with an effective-from and effective-to, provable as present and provable as not omitted, while the identity behind it stays in the controlled record and can be released on examination. This is the same separation as §III, applied to the one field that matters most.

I therefore ask the Commission to confirm that where the wallet-to-holder association is recorded on a distributed ledger, the association may be recorded as a dated commitment rather than as cleartext identity binding.

---

## VI. "Duplicate register": answer by authority, not by count

Both industry letters answer Request for Comment 100 with "no" — no duplicate copy of every record — and propose instead a reconstruction standard, with Vertalo describing a "retention extract." I agree with the conclusion and ask the Commission to state the test that reaches it.

Observed plainly, an extract that must reproduce position detail, the transfer journal, and the wallet-to-holder association **as of any date within the retention period, without reliance on the network's availability or on any third-party explorer or indexing service**, is a copy of the record's substance. The distinction between an extract and a prohibited duplicate is therefore not one of bytes; it is one of **authority**. A retention extract is permitted because it is never authoritative, never competes with the ledger as the register, and is read only on examination, succession, or when the network or a vendor is unavailable. A second authoritative register is prohibited because it is the two-records problem Rule 17ad-10 exists to manage.

The Commission should adopt that test expressly: a non-authoritative retention extract taken for examination, succession, and continuity purposes, and from which no posting is made, is not a duplicate record within the meaning of the rule. This also aligns the answer to Request for Comment 100 with proposed Rule 17ad-7(i), which requires delivery of records to an issuer or its designee within fifteen calendar days of ceasing to serve an issue. A blockchain cannot be delivered. An extract can — but only if the obligation to be able to make one is stated before the moment it is needed.

I further ask the Commission to confirm that these obligations attach to a ledger used as the master securityholder file, so that proposed Rule 17ad-7(f)(2)'s controls govern it. Both industry letters identify a possible scope gap on this point. The Commission should close it in the rule text rather than in the adopting release, because an examiner reads the rule.

---

## VII. On Request for Comment 105

Both industry letters answer Request for Comment 105 by saying that no exemption from the deleted-position-detail retention requirement is needed, because entries on a public blockchain cannot be deleted, and that immutability is therefore the strongest form of compliance. I agree that no exemption is needed. I would put the reasoning differently, and the difference has consequences.

Rule 17ad-10(f) requires a record of deleted position detail to be retained. It does not require that anything be deleted. An immutable ledger satisfies the retention obligation by construction — but it also **forecloses the act the rule presupposes may occur**. The Commission is therefore not asking a question about an exemption. It is asking what to do when the retention obligation is satisfied by a mechanism that makes a different obligation impossible to satisfy.

The Commission should answer by separating the two obligations, as described in §III: confirm that the completeness of the record is preserved by the commitment and the sequence, and that the payload may be removed where the law requires removal, without the removal being treated as tampering with, or an omission from, the record. On an immutable ledger the sequence is the evidence; the payload is not the sequence.

That is a narrower claim than "immutability is compliance," and I submit it is the one the Commission can rely on.

---

## VIII. Requested clarifications

For convenience, the specific confirmations I ask the Commission to make in the adopting release:

1. That the obligation to maintain completeness of the master securityholder file and the obligation to retain position detail are separable, and that a design in which entries are committed to an append-only sequence may satisfy the first while permitting lawful removal of the second.
2. That the unavailability of deletion on a ledger is not a condition of, and does not by itself satisfy, the position-detail retention requirement, and that no exemption from Rule 17ad-10(f) is required or appropriate.
3. That where a distributed ledger is the master securityholder file or a component of it, the Commission has addressed how position detail that constitutes personal data may be maintained, and has not required its publication.
4. That a dated commitment to a wallet-to-holder association, rather than the cleartext binding, may be the onchain record of that association.
5. That a non-authoritative retention extract taken for examination, succession, and continuity purposes is not a duplicate record.
6. That a distributed ledger used as the master securityholder file or a component of it is an "electronic recordkeeping system" governed by proposed Rule 17ad-7(f)(2), such that the controls there — including recovery from loss "from any cause" — reach it.

I appreciate the opportunity to comment and would welcome the chance to discuss any of these matters with the staff.

Respectfully submitted,

**[NAME]**
**[AFFILIATION / CAPACITY IN WHICH COMMENTING]**
**[CONTACT]**

cc: The Hon. Paul S. Atkins, Chairman; the Hon. Hester M. Peirce, Commissioner; the Hon. Mark T. Uyeda, Commissioner; Elizabeth Fitzgerald, Assistant Director, Office of Clearance and Settlement, Division of Trading and Markets
