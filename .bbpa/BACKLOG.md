# Dealflow Network - Backlog
*Last updated: 2026-01-02*
*Style: conversational*

---

## User Stories

### US-001: Backend Infrastructure for Multi-Method Import
**Status:** Ready for Planning
**Created:** 2026-01-02

**As a** developer
**I want** OCR, CSV parsing, and bulk import backend services
**So that** the frontend can support 6 different contact import methods

#### Acceptance Criteria
- [ ] OCR service can extract text from uploaded images (Tesseract.js)
- [ ] Morpheus service can extract contacts from screenshot text
- [ ] CSV parser can handle all contact fields with column mapping
- [ ] tRPC endpoints support: screenshot extraction, bulk URL enrichment, CSV parsing, bulk contact creation
- [ ] Bulk operations include duplicate detection
- [ ] Rate limiting handles parallel enrichment (3 concurrent)

#### Notes
- Dependencies: tesseract.js, papaparse
- Files: `server/_core/ocr.ts`, `server/_core/csv-parser.ts`, `server/morpheus.ts`, `server/routers.ts`
- Week 1 scope

---

### US-002: Method Selection & Input Components
**Status:** Ready for Planning
**Created:** 2026-01-02

**As a** user
**I want** to choose from 6 different ways to add contacts
**So that** I can use the method that best fits my data source

#### Acceptance Criteria
- [ ] Method selection screen shows 6 cards: Single URL, Screenshot, Multiple URLs, File Upload, CSV, Manual
- [ ] Screenshot upload accepts .png/.jpg files and shows preview
- [ ] Multiple URLs input accepts textarea with URLs (one per line)
- [ ] File upload accepts .txt files
- [ ] CSV upload accepts .csv files with column mapping
- [ ] Manual entry form is extracted and accessible directly
- [ ] All inputs validate before proceeding

#### Notes
- Components: MethodSelectionStep, ScreenshotUploadInput, MultipleUrlsInput, FileUploadInput, CsvUploadInput, ManualEntryForm
- Week 2 scope
- Mobile responsive (stack cards vertically)

---

### US-003: Review & Processing Interface
**Status:** Ready for Planning
**Created:** 2026-01-02

**As a** user
**I want** to review and edit extracted contacts before creating them
**So that** I can fix errors and avoid duplicates

#### Acceptance Criteria
- [ ] Processing screen shows progress for async operations (OCR, enrichment, parsing)
- [ ] Single contact review shows editable form (existing flow)
- [ ] Bulk review shows table with inline editing
- [ ] Duplicate contacts are visually indicated
- [ ] User can select which contacts to create (checkboxes)
- [ ] Completion screen summarizes results (N created, N duplicates, N errors)

#### Notes
- Components: ProcessingScreen, BulkContactReview, CompletionScreen
- Week 3 scope
- Table should be horizontally scrollable on mobile

---

### US-004: Wizard Integration & Polish
**Status:** Ready for Planning
**Created:** 2026-01-02

**As a** user
**I want** a smooth wizard experience that handles errors gracefully
**So that** I can successfully import contacts regardless of edge cases

#### Acceptance Criteria
- [ ] CreateContactDialog orchestrates all steps with proper state management
- [ ] Backward compatible with existing "Add Contact" button
- [ ] Error handling: OCR failures, enrichment failures, CSV errors, duplicates
- [ ] Mobile responsive across all steps
- [ ] E2E tests cover each import method
- [ ] Performance optimized for bulk operations
- [ ] Documentation updated

#### Notes
- Main file: `client/src/components/CreateContactDialog.tsx` (full redesign)
- Week 4 scope
- Reference: `server/db-collaborative.ts` for duplicate detection patterns

---

## Notes

**Epic:** Contact Creation & Import Redesign
**Timeline:** 4 weeks
**Plan Reference:** `/Users/scottberenzweig/.claude/plans/recursive-jumping-phoenix.md`

**Critical Technical Challenges:**
1. OCR accuracy (fallback to manual paste)
2. LinkedIn enrichment latency (parallel processing, progress UI)
3. CSV column mapping (auto-detect + manual override)
4. Duplicate detection in bulk (visual indicators)
5. Mobile file upload (native picker + drag-drop)

Use "plan US-00X" to break down a story into tasks on the board.
