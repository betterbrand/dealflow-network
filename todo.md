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
- [x] Complete enrichment service to populate LinkedIn/Twitter data automatically


## Enrichment Automation
- [x] Complete enrichment service to update contact records with fetched LinkedIn data
- [x] Integrate enrichment into contact creation flow (trigger on LinkedIn URL)
- [x] Store enriched data in contact fields (experience, education, skills, profilePictureUrl, summary)
- [x] Test enrichment with real LinkedIn profile (Satya Nadella - 5 experience, 3 education entries)
- [x] Add error handling for failed enrichment attempts
- [x] Create automated test script for enrichment verification


## Contact Editing Feature
- [x] Implement backend update procedure for contacts
- [x] Create edit contact dialog/form component with all fields
- [x] Add validation for required fields and LinkedIn URL format
- [x] Integrate "Edit Contact" button into contact detail page
- [x] Support adding LinkedIn URLs to existing contacts (trigger enrichment on save)
- [x] Allow manual correction of auto-enriched data
- [x] Test editing workflow end-to-end (successfully updated Satya Nadella's email)
- [x] Verify UI auto-refreshes after saving changes
- [ ] Test enrichment re-trigger when LinkedIn URL is changed on existing contact

- [x] Fix graph relationship labels - currently overlapping with nodes and unreadable
- [x] Make relationship labels only visible on hover/click for cleaner default view


## Graph Scalability Improvements
- [x] Implement responsive graph sizing (use container dimensions instead of fixed 1000x600)
- [x] Add fullscreen mode toggle button
- [x] Increase node and label sizes for better readability
- [x] Test graph at different screen sizes
- [x] Add smooth transitions between normal and fullscreen views
- [x] Verify fullscreen controls (Refresh and Minimize buttons)

- [x] Fix Vite HMR WebSocket connection error (failing to connect to dev server)

- [x] Set up GitHub Actions CI/CD workflow for automated testing and building


## GitHub Actions Configuration
- [x] Add GitHub Secrets for CI/CD pipeline (DATABASE_URL, JWT_SECRET, OAUTH_SERVER_URL, etc.)

## Companies Feature Implementation
- [x] Create companies table schema and backend procedures
- [x] Build company profile pages showing aggregated contacts
- [x] Add company-level relationship tracking
- [x] Display company insights (number of contacts, relationship strength)
- [x] Link contacts to their companies in the UI
- [x] Add company filtering and search

## Graph Filtering Controls
- [x] Add filter UI controls to Knowledge Graph page
- [x] Implement filter by company
- [x] Implement filter by relationship type
- [ ] Implement filter by date range
- [ ] Implement filter by event
- [x] Add "Clear All Filters" button
- [x] Show active filter badges
- [x] Update graph visualization based on active filters


## Knowledge Graph UI/UX Enhancements

### Visual Improvements
- [ ] Add color coding by company or relationship strength
- [ ] Implement node size based on connection count
- [ ] Add animated transitions for filter changes
- [ ] Improve node labels with better typography
- [ ] Add visual indicators for different relationship types

### Interaction Enhancements
- [ ] Add node selection with details panel
- [ ] Implement click-to-highlight connected nodes
- [ ] Add double-click to expand node connections
- [ ] Show relationship details on edge hover
- [ ] Add zoom controls and mini-map

### Analytics & Insights
- [ ] Display network statistics (density, clusters, key connectors)
- [ ] Show top influencers/most connected nodes
- [ ] Add relationship strength visualization
- [ ] Implement community detection/clustering
- [ ] Show shortest path between two nodes

### Advanced Features
- [ ] Add graph layout options (force, circular, hierarchical)
- [ ] Implement graph search with highlighting
- [ ] Add export to PNG/SVG
- [ ] Enable node drag and pin functionality
- [ ] Add time-based graph evolution view


## Bug Fixes
- [x] Fix graphRef.current.refresh is not a function error in Graph.tsx


## Contact Creation Flow Redesign
- [x] Update CreateContactDialog to start with LinkedIn/X URL input
- [x] Add automatic enrichment on URL submission
- [x] Show loading state during enrichment
- [x] Display enriched data for user review/edit
- [ ] Add X/Twitter profile enrichment service (similar to LinkedIn)
- [x] Update UI to clearly indicate import-first workflow


## Graph Zoom Adjustment
- [x] Change initial zoom padding from 50 to 20 for wider view


## Cytoscape.js Migration
- [x] Install cytoscape, cytoscape-popper, cytoscape-context-menus, cytoscape-cola
- [x] Create new CytoscapeGraph component
- [x] Implement node styling (color by company, size by connections)
- [x] Add hover tooltips with contact details
- [x] Add right-click context menus
- [x] Implement cola layout with collision avoidance
- [x] Integrate filtering with Cytoscape
- [x] Replace old Graph component
- [x] Test all interactions


## Bug Fixes
- [x] Fix node.popper is not a function error by replacing with native tooltip implementation


## Graph Layout Improvements
- [x] Replace cola layout with fCoSE layout for better node distribution
- [x] Test fCoSE layout performance and visual quality


## Natural Language Query System
- [x] Design query system architecture (LLM parser + graph search + highlighting)
- [ ] Create backend tRPC procedure for natural language queries
- [ ] Implement LLM-based query parser to extract search criteria
- [x] Build graph search engine (filter by company, role, location, industry, etc.)
- [x] Add query UI with search bar above graph
- [x] Implement visual highlighting of matching nodes in graph
- [ ] Add introduction path finder ("Who can introduce me to X?")
- [ ] Create query history and saved searches
- [ ] Add smart suggestions based on query patterns


## Smart Relationship Suggestions
- [x] Build backend algorithm to find potential connections based on shared attributes
- [x] Create tRPC procedure to get relationship suggestions
- [x] Design suggestions UI with approve/dismiss workflow
- [x] Add suggestion cards showing shared context (company, role, location)
- [x] Implement one-click relationship creation from suggestions
- [x] Add dismiss/ignore functionality for irrelevant suggestions
- [x] Test suggestion accuracy and relevance


## AI-Powered Natural Language Queries
- [x] Create LLM query parser with structured JSON output schema
- [x] Build backend tRPC procedure for natural language queries
- [x] Implement complex search filters (company, role, location, date, etc.)
- [ ] Add introduction path finder ("Who can introduce me to X?")
- [ ] Create query UI with chat-style interface
- [ ] Display query results with visual highlighting in graph
- [ ] Add query history and saved queries
- [ ] Implement follow-up question support
- [ ] Test with complex real-world queries

## AI-Powered Natural Language Queries
- [x] Create query service with LLM-powered natural language parsing
- [x] Implement aiQuery tRPC procedure for executing parsed queries
- [x] Build AI Query page with chat-style interface
- [x] Add example queries for user guidance
- [x] Display query explanation and parsed intent
- [x] Show results with contact cards
- [x] Add AI Query navigation item to sidebar
- [x] Write vitest test structure (requires LLM API access to run)
- [ ] Implement introduction path finding (who can introduce me to X)
- [ ] Add query history
- [ ] Add follow-up question suggestions

## Bug Fixes - AI Query
- [x] Fix "Invalid response from LLM" error in AI Query feature
- [x] Add proper error handling and logging for LLM API responses
- [x] Test with real queries to verify fix

## Query History Feature
- [x] Create database schema for query history table
- [x] Add tRPC procedures for saving, retrieving, and deleting query history
- [x] Build query history sidebar UI component
- [x] Add click-to-reuse functionality for past queries
- [x] Add delete functionality for individual history items
- [x] Automatically save queries when executed
- [x] Display query timestamp and result count
- [x] Test query history persistence and retrieval

## Bug Fixes - AI Query Layout
- [x] Fix AI Query page to use DashboardLayout properly
- [x] Remove duplicate sidebar navigation
- [x] Ensure query history sidebar works within DashboardLayout

## Keyboard Shortcuts Feature
- [x] Create KeyboardShortcutsModal component with categorized sections
- [x] Implement Cmd/Ctrl+K to focus search input
- [x] Implement Cmd/Ctrl+Enter to submit query
- [x] Implement Escape to clear input
- [x] Implement Arrow Up/Down to navigate history
- [x] Implement Enter on history item to execute query
- [x] Implement Cmd/Ctrl+Shift+H to toggle history sidebar
- [x] Implement Delete/Backspace on history item
- [x] Implement J/K keys to navigate results
- [x] Implement Enter on result to open contact
- [x] Implement 1-5 number keys for example queries
- [x] Implement Cmd/Ctrl+/ and ? to show shortcuts modal
- [x] Add platform detection for Mac/Windows key display
- [x] Add visual indicators (ring) for selected items
- [x] Test all keyboard shortcuts

## Follow-up Questions Feature
- [x] Create LLM-powered follow-up question generation
- [x] Generate contextual suggestions based on query and results
- [x] Add follow-up questions UI section after results
- [x] Make suggestions clickable to execute new queries
- [x] Show 3-5 relevant follow-up questions
- [x] Test follow-up question generation and interaction

## Database Cleanup and Sample Data
- [x] Fix database schema issues from partial migration
- [x] Revert contacts table to original working schema
- [x] Drop temporary tables (userContacts, contactContributions)
- [x] Clear all existing contacts
- [x] Create realistic sample dataset (16 contacts)
- [x] Use real LinkedIn-style profiles with rich data
- [x] Add sample companies (6 companies: OpenAI, Anthropic, Microsoft, YC, Sequoia, Stripe)
- [x] Create sample networking events (3 events)
- [x] Add contact relationships for knowledge graph (25 relationships)
- [x] Test all features with sample data

## Collaborative Contacts System
- [ ] Design new database schema for shared contacts
- [ ] Create userContacts junction table for user-contact relationships
- [ ] Create contactContributions table for provenance tracking
- [ ] Implement duplicate detection logic (email, LinkedIn, name+company)
- [ ] Update createContact to check for duplicates and link users
- [ ] Add user-specific fields (private notes, relationship context)
- [ ] Update getAllContacts to show shared contacts
- [ ] Add collaboration indicators in UI (who else knows this contact)
- [ ] Show contribution history (who added/updated what)
- [ ] Migrate existing contacts to new schema safely

## Bulk Contact Import
- [ ] Create CSV parser for contact imports
- [ ] Support LinkedIn export format
- [ ] Build import preview with duplicate detection
- [ ] Add field mapping UI for custom CSV formats
- [ ] Implement batch contact creation with progress tracking
- [ ] Add import history and rollback capability
- [ ] Create import UI page with drag-drop upload

## Contact Scoring System
- [ ] Design scoring algorithm (relationship strength, interaction frequency, strategic value)
- [ ] Add score field to contacts/userContacts table
- [ ] Implement scoring calculation logic
- [ ] Create background job to update scores periodically
- [ ] Add score-based sorting and filtering
- [ ] Show score badges in contact cards
- [ ] Create "Top Contacts" dashboard widget

## Collaborative Contacts System - COMPLETED ✅
- [x] Design new database schema for shared contacts
- [x] Create userContacts junction table for user-contact relationships  
- [x] Create contactContributions table for provenance tracking
- [x] Implement duplicate detection logic (email, LinkedIn, name+company)
- [x] Create createOrLinkContact function with automatic duplicate detection
- [x] Add user-specific fields (privateNotes, relationshipStrength, howWeMet, etc.)
- [x] Migrate existing 16 contacts to new collaborative schema
- [x] Update backend procedures to use collaborative model
- [x] Add backward compatibility layer for frontend
- [x] Fix all TypeScript errors from schema migration
- [ ] Add collaboration UI indicators (show who else knows this contact)
- [ ] Show contribution history in contact detail page
- [ ] Build admin merge tool for manual duplicate resolution


## Auth0 Integration - White-Label Authentication

### Phase 1: Auth0 Setup & Configuration
- [ ] Create Auth0 account and application
- [ ] Configure Auth0 application settings (callback URLs, allowed origins)
- [ ] Set up custom domain in Auth0 for white-label experience
- [ ] Configure Universal Login branding (logo, colors, custom CSS)
- [ ] Enable social connections (Google, GitHub, LinkedIn)
- [ ] Set up email templates (welcome, password reset, verification)
- [ ] Configure MFA options (SMS, authenticator app)
- [ ] Store Auth0 credentials as secrets (DOMAIN, CLIENT_ID, CLIENT_SECRET)

### Phase 2: Backend Integration
- [ ] Install Auth0 SDK dependencies (`express-oauth2-jwt-bearer`, `auth0`)
- [ ] Create Auth0 middleware for JWT validation
- [ ] Replace Manus OAuth callback with Auth0 callback handler
- [ ] Update session management to use Auth0 tokens
- [ ] Migrate user identification from Manus openId to Auth0 sub
- [ ] Update `protectedProcedure` to validate Auth0 JWTs
- [ ] Create user sync logic (Auth0 → local database)
- [ ] Add Auth0 Management API integration for user operations
- [ ] Update logout flow to clear Auth0 session
- [ ] Test token refresh and expiration handling

### Phase 3: Frontend Integration
- [ ] Install Auth0 React SDK (`@auth0/auth0-react`)
- [ ] Wrap app with Auth0Provider in main.tsx
- [ ] Replace useAuth hook with Auth0's useAuth0 hook
- [ ] Update login button to use Auth0's loginWithRedirect
- [ ] Update logout to use Auth0's logout method
- [ ] Remove Manus OAuth portal references
- [ ] Update DashboardLayout to use Auth0 user object
- [ ] Handle Auth0 loading states and errors
- [ ] Test authentication flow end-to-end
- [ ] Update user profile display with Auth0 user data

### Phase 4: Data Migration
- [ ] Create migration script to map existing users
- [ ] Export current user data (openId, email, name)
- [ ] Import users to Auth0 via Management API or bulk import
- [ ] Map Manus openId to Auth0 sub in database
- [ ] Test user login with migrated accounts
- [ ] Verify all user-specific data (contacts, notes) still accessible
- [ ] Create rollback plan in case of issues

### Phase 5: Testing & Cleanup
- [ ] Test login flow with Google OAuth
- [ ] Test login flow with email/password
- [ ] Test logout and session expiration
- [ ] Test protected routes and API endpoints
- [ ] Verify user permissions and role-based access
- [ ] Test on multiple browsers and devices
- [ ] Remove all Manus OAuth code from server/_core/oauth.ts
- [ ] Remove Manus OAuth environment variables
- [ ] Update documentation with Auth0 setup instructions
- [ ] Save checkpoint after successful migration

### Phase 6: Production Deployment
- [ ] Configure Auth0 production tenant
- [ ] Set up custom domain (auth.yourdomain.com)
- [ ] Update production environment variables
- [ ] Test authentication on production domain
- [ ] Monitor Auth0 logs for errors
- [ ] Set up Auth0 alerts for anomalies
- [ ] Document Auth0 admin procedures for team

### Considerations & Notes
- **Estimated Time:** 1-2 days for full implementation and testing
- **Cost:** Auth0 free tier (7,500 MAU), then $35/month (Essentials) or $240/month (Professional)
- **Custom Domain:** Requires Auth0 Essentials plan or higher for white-label auth.yourdomain.com
- **User Migration:** Can use Auth0's automatic migration feature to migrate users on first login
- **Rollback:** Keep Manus OAuth code in git history for 30 days in case rollback needed
- **Alternative:** Consider Clerk if faster implementation and modern DX preferred over Auth0's enterprise features


## Magic Link Authentication - MVP White-Label Solution
- [ ] Create hardcoded authorized users whitelist
- [ ] Build magic link token generation and validation
- [ ] Set up email service for sending magic links
- [ ] Create login page with email input
- [ ] Build magic link verification endpoint
- [ ] Replace Manus OAuth middleware with magic link auth
- [ ] Update frontend to use magic link flow
- [ ] Test magic link login end-to-end
- [ ] Remove all Manus OAuth references


## Magic Link Authentication (MVP)
- [x] Create magic link token generation and verification
- [x] Implement hardcoded user whitelist (AUTHORIZED_USERS)
- [x] Build magic link email service (console logging for MVP)
- [x] Create /api/auth/magic-link/request endpoint
- [x] Create /api/auth/magic-link/verify endpoint
- [x] Update context.ts to use magic link authentication
- [x] Replace OAuth routes with magic link routes
- [x] Build Login page UI
- [x] Update App.tsx to show login when not authenticated
- [x] Update useAuth hook for magic link logout
- [x] Install required packages (jsonwebtoken, cookie-parser)
- [x] Add cookie-parser middleware to Express
- [x] Test magic link flow end-to-end (13/13 tests passing)
- [x] Verify login UI is completely white-labeled
- [ ] Integrate real email service (Resend/SendGrid) for production


## Admin User Management
- [x] Create backend procedures for listing authorized users
- [x] Create backend procedure for adding users to whitelist
- [x] Create backend procedure for removing users from whitelist
- [x] Build admin UI page with user list table
- [x] Add form for adding new authorized users
- [x] Add remove button for each user in list
- [x] Implement admin-only access control
- [x] Write comprehensive tests (15/15 passing)
- [x] Add Admin Users navigation item to sidebar


## Persist Authorized Users to Database
- [x] Create authorizedUsers table in schema
- [x] Add database migration for new table
- [x] Create database functions for CRUD operations on authorized users
- [x] Update admin-users.ts to use database instead of in-memory array
- [x] Migrate existing whitelist data to database
- [x] Update magic-link.ts to check database for authorization
- [x] Test persistence across server restarts
- [x] Update tests to work with database

## Magic Link Testing
- [x] Create temporary admin endpoint to generate magic links for testing (console logs not accessible)
- [x] Test magic link login flow end-to-end

## Resend Email Integration
- [x] Request and configure Resend API key
- [x] Update magic-link-email.ts to use Resend API
- [x] Configure sender email domain
- [x] Test email delivery end-to-end

## Fix Authentication Flow
- [x] Investigate why Manus OAuth is showing instead of magic link login
- [x] Update routing to use magic link as primary authentication
- [x] Remove or disable Manus OAuth redirect
- [x] Test that magic link login page shows by default

## Temporary Email-Gate Authentication (TEMPORARY WORKAROUND)
- [x] Create simple email-gate login page (no verification)
- [x] Update session handling to store email without magic link
- [x] Bypass authorization whitelist check
- [x] Update authentication context to use email-gate
- [x] Test login flow
- [x] Save checkpoint for publishing
- [x] NOTE: This is temporary - revert to magic link once publishing is fixed

## Push to GitHub
- [x] Initialize git repository if needed
- [x] Create branch for current state (temp-sans-auth)
- [x] Push code to GitHub
- [x] Verify push successful
