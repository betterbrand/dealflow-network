# DealFlow Network - Current Features

## Contact Management
- Store professional contacts with rich profile data including work history, education, skills
- Automated LinkedIn enrichment fetches experience, education, and profile pictures
- Company profiles aggregate all contacts by organization
- Event tracking records networking events and associated contacts
- Social profile integration links LinkedIn and Twitter accounts

## Knowledge Graph Visualization
- Interactive force-directed network graph using Cytoscape.js
- Nodes colored by company affiliation, sized by connection count
- Hover tooltips display quick contact details
- Right-click context menus for rapid actions
- Filter by company, relationship type, and attributes
- Fullscreen mode with responsive fCoSE layout algorithm

## Relationship Management
- Multiple relationship types: introduced_by, works_with, investor_in, mentor_of
- Bidirectional tracking visible from both contact perspectives
- Visual edge labels showing relationship types
- AI-powered relationship suggestions based on shared attributes

## AI-Powered Search
- Natural language queries: "Who do I know at Microsoft?" or "Find CEOs in San Francisco"
- LLM parser extracts companies, roles, locations, names from queries
- Query history saves past searches with timestamps
- AI-generated follow-up question suggestions
- Comprehensive keyboard shortcuts for power users

## Collaborative Features
- Shared contact pool accessible across team members
- Automatic duplicate detection by email, LinkedIn URL, or name+company
- User-specific private notes and relationship context
- Provenance tracking records who added/updated each field
- Contribution history audit log

## Authentication
- Magic link passwordless authentication
- Hardcoded user whitelist for MVP access control
- Secure JWT-based sessions with 30-day expiration
- Completely white-labeled login experience
