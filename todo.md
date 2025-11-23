# DealFlow Network - Project TODO

## Phase 1: Database Schema & Core Models
- [x] Design and implement contacts table
- [x] Design and implement companies table
- [x] Design and implement events table
- [x] Design and implement conversations table (Telegram conversation metadata)
- [x] Design and implement contact_relationships table (for knowledge graph edges)
- [x] Design and implement social_profiles table (LinkedIn, Twitter links)
- [x] Push database schema migrations

## Phase 2: Backend API - Core Procedures
- [x] Create contact CRUD procedures (create, read, update, delete)
- [x] Create company CRUD procedures
- [x] Create event CRUD procedures
- [x] Create procedure to fetch contacts with relationships (for graph view)
- [ ] Create procedure for natural language search using Morpheus AI
- [ ] Create procedure to handle Telegram conversation processing

## Phase 3: Telegram Bot Integration
- [x] Set up Telegram bot webhook endpoint
- [x] Implement /capture command handler
- [x] Implement conversation history fetching from Telegram API
- [x] Implement data normalization for Telegram conversations
- [x] Implement confirmation message flow to team member
- [x] Implement save/edit workflow for extracted data
- [x] Store Telegram bot token as secret

## Phase 4: Morpheus AI Integration
- [x] Create extraction procedure using Morpheus AI API
- [x] Design prompt for structured data extraction from conversations
- [x] Extract: name, company, role, location, event details
- [x] Extract: social media URLs (LinkedIn, Twitter)
- [x] Extract: conversation summary and action items
- [x] Extract: sentiment/interest level
- [x] Store Morpheus AI API credentials as secrets

## Phase 5: Knowledge Graph Enrichment Service
- [x] Create enrichment service procedure
- [x] Implement LinkedIn profile scraping/fetching
- [x] Implement Twitter profile scraping/fetching
- [x] Parse and extract additional data (job history, skills, connections)
- [x] Update contact records with enriched data asynchronously
- [x] Implement enrichment adapter with Manus LinkedIn API
- [x] Test enrichment adapter with real LinkedIn profiles
- [ ] Add ASIMOV semantic transformation (RDF/JSON-LD) for knowledge graph
- [ ] Implement Twitter enrichment via Manus API

## Phase 6: Frontend - Dashboard & Layout
- [x] Design color scheme and typography
- [x] Set up DashboardLayout with sidebar navigation
- [x] Create navigation structure (Dashboard, Contacts, Graph, Search)
- [x] Implement authentication flow with login/logout
- [x] Create loading states and error boundaries

## Phase 7: Frontend - Contact Management
- [x] Create contacts list view with table
- [x] Implement search and filtering
- [x] Create contact detail page
- [ ] Implement contact editing form
- [ ] Display meeting photos and conversation context
- [x] Show provenance (who added, when, which event)
- [ ] Handle contact deduplication UI

## Phase 8: Frontend - Knowledge Graph Visualization
- [x] Install and configure react-force-graph-2d
- [x] Create graph visualization page
- [x] Implement interactive force-directed graph layout
- [x] Implement node click to navigate to contact details
- [x] Add node labels with company information
- [x] Add auto-zoom and fit to view
- [x] Display helpful tip when no relationships exist
- [ ] Implement 2D/3D toggle
- [ ] Implement graph filtering (by event, company, team member)
- [ ] Add UI for creating relationships between contacts

## Phase 9: Frontend - Natural Language Search
- [ ] Create search interface with query input
- [ ] Implement query submission to backend
- [ ] Display results as list or graph
- [ ] Show example queries to users
- [ ] Implement query history

## Phase 10: File Storage & Photos
- [ ] Implement photo upload to S3
- [ ] Store photo URLs in database
- [ ] Display photos in contact detail view
- [ ] Handle multiple photos per contact (from different team members)

## Phase 11: Multi-Team Member Support
- [ ] Implement team member tracking in database
- [ ] Show "added by" information in UI
- [ ] Implement contact deduplication logic
- [ ] Merge contacts when multiple team members meet same person
- [ ] Display all team members who have met a contact

## Phase 12: Testing & Polish
- [ ] Test Telegram bot end-to-end
- [ ] Test AI extraction accuracy
- [ ] Test knowledge graph enrichment
- [ ] Test frontend responsiveness
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error handling and user feedback

## Phase 13: Documentation & Deployment
- [ ] Document Telegram bot setup instructions
- [ ] Document required secrets (Telegram token, Morpheus AI key)
- [ ] Create user guide for team members
- [ ] Save checkpoint for deployment
- [ ] Test deployed application

## Future Enhancements (Out of Scope for MVP)
- [ ] Audio note ingestion
- [ ] Web form for manual contact entry
- [ ] Spreadsheet import
- [ ] Email integration
- [ ] LinkedIn scraping
- [ ] Calendar integration
- [ ] Automated follow-up reminders
- [ ] Deal pipeline stages
- [ ] Revenue tracking
- [ ] Mobile app


## Bugs to Fix
- [x] Fix "Create New Contact" button not working on Contacts page

- [x] Add LinkedIn and Twitter/X URL fields to contact creation form


## Technical Debt - Temporary Solutions
- [ ] **FOR ELECTRON VERSION**: Implement pure ASIMOV+Bright Data integration
  - Location: `server/enrichment-adapter.ts`
  - Current: Using Manus LinkedIn API for web MVP (serverless can't run Rust binaries)
  - Future: Bundle ASIMOV Rust binaries with Electron app for offline operation
  - The adapter pattern is ready - just need to bundle binaries and set USE_PURE_ASIMOV=true
  - Test: `server/test-asimov-brightdata.ts` (will work in Electron with bundled binaries)
  - Note: This is NOT technical debt for the web MVP - it's the correct architecture


## Bug Fixes
- [x] Fix knowledge graph visualization - currently showing empty graph despite having contacts in database

- [ ] Investigate and fix: Published site (dealflownet-xrj2t4w7.manus.space/graph) not showing graph visualization despite checkpoint a1113141 being published (waiting for Manus support to fix git sync issue)

## Phase 10: Relationship Creation UI
- [x] Create tRPC procedures for relationship CRUD operations
- [x] Build relationship creation dialog/modal component
- [x] Add relationship type selector (introduced_by, works_with, investor_in, mentor_of, etc.)
- [x] Implement contact-to-contact selector with search
- [x] Add relationship creation button to graph page
- [x] Update graph visualization to show relationship edges with labels
- [x] Write and pass vitest tests for relationship CRUD (4/4 tests passing)
- [ ] Add relationship creation from contact detail page
- [ ] Display existing relationships in contact detail view
- [ ] Add ability to edit/delete relationships from UI


## Contact Detail Page Enhancement
- [x] Add backend procedure to fetch full contact data with relationships
- [x] Add enrichment fields to database schema (linkedinUrl, twitterUrl, summary, profilePictureUrl, experience, education, skills)
- [x] Display enriched LinkedIn data (experience, education, skills) when available
- [x] Show relationship history with other contacts
- [x] Display social media profile links (LinkedIn, Twitter) with external link buttons
- [x] Add conversation notes section
- [x] Show contact provenance (added date, last updated)
- [x] Add "Add Relationship" button to create new relationships from contact page
- [x] Display profile picture when available
- [x] Add Quick Actions sidebar (View in Graph, Send Email)
- [x] Parse JSON fields (experience, education, skills) for display
- [ ] Add edit button and edit mode for contact information
- [ ] Complete enrichment service to populate LinkedIn/Twitter data automatically
