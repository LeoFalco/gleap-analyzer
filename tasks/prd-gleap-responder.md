# PRD: Gleap Responder — Post Internal Note on Gleap Cards

## Introduction

A Claude Code skill that posts structured investigation reports as internal notes on Gleap support cards. It runs after the `gleap-analyzer` skill has been used, gathering findings from the current conversation context and posting a formatted relatório directly to the Gleap card via the API.

## Goals

- Enable N2 support analysts to post investigation reports to Gleap cards without leaving Claude Code
- Follow a consistent report structure (Problema reportado, Causas identificadas, O que foi feito, Situação atual, Observação)
- Post as an internal note (not visible to the customer) via the Gleap API
- Use current conversation context as the source of investigation findings

## User Stories

### US-001: Create the post script
**Description:** As a developer, I need a Node.js script that posts an internal note to a Gleap card via the API so the skill can programmatically create notes.

**Acceptance Criteria:**
- [ ] Script reads a markdown file and converts it to Gleap's `doc` format (ProseMirror-compatible JSON)
- [ ] Script posts to `POST /v3/messages` with `isNote: true`
- [ ] Script accepts `ticketId`, `projectId`, and `content-file` as CLI arguments
- [ ] Script loads `GLEAP_API_KEY` from `.env` without external dependencies (Node.js built-ins only)
- [ ] Script handles markdown formatting: headings (h1-h3), bold, inline code, links (`<url>` and `[text](url)`), ordered/unordered lists, horizontal rules
- [ ] Script exits with error code and message on API failure
- [ ] Script prints success confirmation with message ID on success
- [ ] Typecheck/lint passes

### US-002: Write SKILL.md with workflow instructions
**Description:** As a Claude Code user, I want the skill to follow a clear workflow so it consistently generates and posts well-structured reports.

**Acceptance Criteria:**
- [ ] SKILL.md frontmatter has `name` and `description` with clear trigger phrases
- [ ] Workflow step 1: gather ticketId, projectId, client name, findings from conversation
- [ ] Workflow step 2: generate report in pt-BR following the exact template structure
- [ ] Workflow step 3: present report to user for review before posting
- [ ] Workflow step 4: save to temp file, run post script, clean up temp file
- [ ] Workflow step 5: error handling for missing API key, missing IDs, API errors
- [ ] Report template includes all sections: Problema reportado, Causas identificadas, O que foi feito, Situação atual, Observação (optional)

### US-003: Validate the skill package
**Description:** As a developer, I need the skill to pass validation and be packagable for distribution.

**Acceptance Criteria:**
- [ ] Skill directory structure follows conventions: `gleap-responder/SKILL.md` + `gleap-responder/scripts/`
- [ ] No unused example files or directories remain
- [ ] `package_skill.py` runs successfully and produces `gleap-responder.skill`
- [ ] Zero external dependencies — only Node.js built-ins used

### US-004: Test end-to-end posting
**Description:** As a support analyst, I want to verify the skill can post a real internal note to a test Gleap card.

**Acceptance Criteria:**
- [ ] Run the post script with a test markdown file against a real Gleap ticket
- [ ] Verify the note appears as an internal note (not customer-visible) in the Gleap UI
- [ ] Verify headings, bold text, links, and lists render correctly in Gleap
- [ ] Verify the note content matches the markdown input

## Functional Requirements

- FR-1: The post script must convert markdown to ProseMirror-compatible `doc` JSON format (headings, paragraphs, bold, code, links, ordered lists, unordered lists, horizontal rules)
- FR-2: The post script must use `POST https://api.gleap.io/v3/messages` with `isNote: true` to create internal notes
- FR-3: The post script must authenticate via `Authorization: Bearer {GLEAP_API_KEY}` and `Project: {projectId}` headers
- FR-4: The skill must extract ticketId and projectId from conversation context (previously used Gleap URL)
- FR-5: The skill must generate reports in Portuguese (pt-BR) following the fixed template structure
- FR-6: The skill must show the report to the user and wait for approval before posting
- FR-7: The skill must clean up temporary files after successful posting

## Non-Goals

- No editing or deleting existing notes
- No posting customer-visible replies (only internal notes)
- No fetching or analyzing the Gleap card (that's `gleap-analyzer`'s job)
- No support for image attachments in notes
- No multi-card batch posting

## Technical Considerations

- Gleap uses ProseMirror-based rich text format (`doc` type with content nodes)
- The `isNote: true` flag on the message payload makes it an internal note
- Default project ID fallback: `695d175e48ac2b20b647cbfe`
- Same `.env` loading pattern as the existing `fetch-gleap-card.js` script
- Node 18+ required for native `fetch`

## Success Metrics

- Report posted to Gleap in under 30 seconds from user approval
- Report renders correctly with proper formatting in Gleap UI
- Zero manual copy-paste needed — fully automated from conversation to Gleap

## Open Questions

- Does the Gleap `doc` format support all ProseMirror node types, or is there a subset? (needs testing)
- Should consecutive list items be grouped into a single `bulletList`/`orderedList` node, or is one-item-per-list acceptable?
- Is there a character limit for internal notes in Gleap?
