---
name: restate-docs-style
description: Write, edit, or review Restate documentation in this repository using direct, precise technical prose. Apply to MDX page content, descriptions, headings, callouts, and explanatory snippet comments.
---

# Restate documentation style

Write for developers who need to understand behavior and complete a task. Use plain, specific language with a professional but approachable tone. The preferred style is illustrated by `docs/services/invocation/webhooks.mdx`, relative to the repository root. Use that page as a style reference, not as evidence for unrelated product behavior.

## Voice and wording

* Address the reader as "you" and use imperative verbs for instructions: "Configure the sender", "Verify the signature", "Return immediately".
* Describe system behavior with a concrete subject and action: "Restate Cloud forwards the request body" or "The sender receives `504`".
* Prefer precise technical terms over conversational shortcuts. Say "times out", "receives", "rejects", "forwards", and "returns" when those are the actual operations.
* Avoid anthropomorphism and vague phrasing such as "your handler sees", "the handler trusts", "senders give up", "hand off the work", and "things you want to keep". Name the data, operation, or condition instead.
* Keep sentences complete and connected. Do not make prose sound simpler by splitting it into abrupt fragments or adding conversational asides.
* Prefer familiar words over bureaucratic replacements. "Use" is better than "utilize". Contractions are fine when natural; formality is not the goal.
* Preserve exact API names, status codes, units, conditions, and distinctions between requests, deliveries, events, and invocations. A style edit must not strengthen a guarantee or change technical meaning.

## Examples of the preferred wording

These examples illustrate editorial choices, not automatic substitutions. Choose wording that accurately describes the feature being documented.

| Avoid | Prefer |
| --- | --- |
| What your handler sees: The body, byte for byte. | Restate Cloud forwards the unmodified request body to your handler. |
| Before your handler trusts a request, it checks that the sender really sent it. | Verify the sender's signature before processing the request. |
| Most senders give up much sooner. | Most senders time out sooner. |
| Give your service its signing secret. | Configure your service with the webhook's signing secret. |
| Return right away. | Return immediately. |
| Widen the limit if this rejects deliveries you want to keep. | Increase the limit if you need to accept delayed deliveries. |
| The URL is wrong. | The URL is invalid. |

## Headings and organization

* Use descriptive headings that identify the action and object. Prefer "Configure webhook senders" to "Senders" and "Verify signatures manually" to "Verify it yourself".
* Open with what the feature does and when the reader would use it. State product availability or prerequisites early when they affect whether the reader can follow the page. Use an Info box for a meaningful availability restriction, not on every page.
* Put instructions in the order the reader performs them. Use numbered steps for sequences, tables for comparisons or reference data, and bullets for parallel information.
* Keep operational caveats near the relevant action. Explain a limitation once and link to it elsewhere when useful. Retain deliberate repetition when it helps readers use a reference independently.
* Keep warnings specific to a consequence and the action the reader should take. Avoid dramatic phrasing, vague cautions, and unnecessary callouts.
* For a wording-only request, preserve the existing structure unless the user also asks to reorganize it.

## Applying the style

1. Read the target content, applicable `AGENTS.md`, and nearby pages for terminology and context. Follow the durable coordination terminology in the repository guidance. Existing awkward wording is not a style requirement.
2. Make the smallest changes that satisfy the request. For review-only requests, report concrete findings and suggested wording rather than editing files.
3. Preserve technical facts. If a proposed rewrite depends on an unknown fact, check the relevant source or ask a focused question. Do not invent product behavior to make a sentence cleaner.
4. When changing comments in a `CODE_LOAD` example, update the source under `snippets/` and keep the embedded MDX block synchronized. Preserve code behavior during editorial work.
5. Reread the changed passages for vague verbs, conversational fragments, repetition, and ambiguous pronouns. Check changed headings for affected anchor links and follow the repository's MDX conventions.
6. Inspect the final diff, run `git diff --check`, and verify the intended wording is present in the saved files. Report the scope of validation accurately; a prose check does not validate runtime behavior or external provider requirements.
