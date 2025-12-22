# Bright Data Complete Enrichment Implementation Plan

## Overview
Bring in ALL available data from Bright Data LinkedIn API into the contacts table and RDF semantic graph.

---

## 📊 Schema Changes

### New Fields to Add to `contacts` Table

```typescript
// drizzle/schema.ts - contacts table additions

export const contacts = mysqlTable("contacts", {
  // ... existing fields ...

  // === STEP 1: Social Proof & Reach ===
  followers: int("followers"),                    // LinkedIn follower count
  connections: int("connections"),                 // Already exists, verify type

  // === STEP 2: Visual Assets (Logos) ===
  bannerImageUrl: text("bannerImageUrl"),         // Profile banner image
  // Experience and Education will store logos in their JSON arrays

  // === STEP 3: Name Parsing ===
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),

  // === STEP 4: External Links ===
  bioLinks: text("bioLinks"),                     // JSON array: [{title, link}]

  // === STEP 5: Recent Activity & Content ===
  posts: text("posts"),                           // JSON array of recent posts
  activity: text("activity"),                     // JSON array of recent activity

  // === STEP 6: Network Expansion ===
  peopleAlsoViewed: text("peopleAlsoViewed"),     // JSON array of similar profiles

  // === Additional Metadata from Bright Data ===
  linkedinId: varchar("linkedinId", { length: 100 }),        // LinkedIn profile ID
  linkedinNumId: varchar("linkedinNumId", { length: 100 }), // Numeric LinkedIn ID
  city: varchar("city", { length: 255 }),                    // Granular city
  countryCode: varchar("countryCode", { length: 10 }),       // ISO country code
  memorializeAccount: int("memorializeAccount").default(0),  // Boolean: is memorial
  educationDetails: text("educationDetails"),                // Free-text education summary
  honorsAndAwards: text("honorsAndAwards"),                  // JSON object of awards

  // Enrichment metadata
  lastEnrichedAt: timestamp("lastEnrichedAt"),
  enrichmentSource: varchar("enrichmentSource", { length: 50 }), // "brightdata", "manual"
});
```

### TypeScript Interface for Bright Data Response

```typescript
// server/_core/brightdata.ts

export interface BrightDataLinkedInProfile {
  // Identity
  name?: string;
  firstName?: string;
  lastName?: string;
  linkedinId?: string;
  linkedinNumId?: string;

  // Professional
  headline?: string;
  position?: string;

  // Location
  location?: string;
  city?: string;
  countryCode?: string;

  // Bio
  summary?: string;
  about?: string;

  // Experience & Education
  experience?: Array<{
    title: string;
    company: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    descriptionHtml?: string;
    url?: string;
    companyLogoUrl?: string;  // NEW
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    url?: string;
    instituteLogoUrl?: string;  // NEW
  }>;
  educationDetails?: string;

  // Skills & Recognition
  skills?: string[];
  honorsAndAwards?: {
    title?: string;
    items?: Array<{ name: string; issuer?: string; date?: string }>;
  };

  // Social Proof
  connections?: number;
  followers?: number;

  // Visual Assets
  profilePictureUrl?: string;
  avatar?: string;
  bannerImage?: string;
  defaultAvatar?: boolean;

  // External Links
  bioLinks?: Array<{
    title: string;
    link: string;
  }>;

  // Content & Activity
  posts?: Array<{
    id: string;
    title: string;
    attribution?: string;
    link: string;
    createdAt: string;
    interaction?: string;
  }>;
  activity?: Array<{
    id: string;
    interaction: string;
    link: string;
    title: string;
    img?: string;
  }>;

  // Network
  peopleAlsoViewed?: Array<{
    name: string;
    profileLink: string;
    about?: string;
    location?: string;
  }>;

  // Current Company Details
  currentCompany?: {
    name: string;
    companyId: string;
    title: string;
    location?: string;
  };
  currentCompanyName?: string;
  currentCompanyCompanyId?: string;

  // Metadata
  memorializeAccount?: boolean;
  url?: string;
  inputUrl?: string;
  timestamp?: string;
}
```

---

## 🔀 Git Branch Strategy

### Branch Hierarchy
```
main
  └─ claude/brightdata-enrichment-schema (Step 1: Schema)
       └─ claude/brightdata-enrichment-transform (Step 2: Transformation)
            └─ claude/brightdata-enrichment-db-save (Step 3: DB Save)
                 └─ claude/brightdata-enrichment-rdf (Step 4: RDF)
                      └─ claude/brightdata-enrichment-ui (Step 5: UI)
                           └─ claude/brightdata-enrichment-complete (Final PR)
```

### Branch Details

**Step 1: `claude/brightdata-enrichment-schema`**
- Add all new fields to `drizzle/schema.ts`
- Run `npm run db:push` to migrate
- Update TypeScript types

**Step 2: `claude/brightdata-enrichment-transform`**
- Update `transformBrightDataResponse()` in `server/_core/brightdata.ts`
- Map all new fields from API response
- Add validation

**Step 3: `claude/brightdata-enrichment-db-save`**
- Update `updateContactEnrichment()` in `server/db.ts`
- Save all new fields to database
- Update `server/enrichment.ts` to pass new data

**Step 4: `claude/brightdata-enrichment-rdf`**
- Update RDF mapping in `server/enrichment-adapter.ts`
- Add new predicates for all fields
- Update semantic graph generation

**Step 5: `claude/brightdata-enrichment-ui`**
- Display new fields in contact detail page
- Show logos in experience/education
- Add follower count badge
- Show recent posts/activity

**Step 6: `claude/brightdata-enrichment-complete`**
- Merge all changes
- Final testing
- Create PR to main

---

## 🕸️ RDF Semantic Graph Mapping

### Namespace Prefixes
```turtle
@prefix schema: <http://schema.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix vcard: <http://www.w3.org/2006/vcard/ns#> .
@prefix bio: <http://purl.org/vocab/bio/0.1/> .
@prefix sioc: <http://rdfs.org/sioc/ns#> .
@prefix as: <http://www.w3.org/ns/activitystreams#> .
```

### RDF Triples Mapping

#### Person Identity
```turtle
:contact_123 a schema:Person, foaf:Person ;
  foaf:name "Bill Gates" ;
  foaf:givenName "Bill" ;
  foaf:familyName "Gates" ;
  schema:identifier :linkedin_billgates ;
  schema:alternateName "William H. Gates III" .
```

#### Professional Info
```turtle
:contact_123
  schema:jobTitle "Co-chair" ;
  schema:worksFor :company_gates_foundation ;
  schema:hasOccupation :role_cochair .
```

#### Experience (with logos)
```turtle
:contact_123 schema:hasOccupation [
  a schema:Role ;
  schema:roleName "Co-chair" ;
  schema:startDate "2000" ;
  schema:endDate "Present" ;
  schema:worksFor [
    a schema:Organization ;
    schema:name "Gates Foundation" ;
    schema:identifier "gates-foundation" ;
    schema:logo <https://media.licdn.com/...logo.jpg> ;
    schema:url <https://www.linkedin.com/company/gates-foundation>
  ]
] .
```

#### Education (with logos)
```turtle
:contact_123 schema:alumniOf [
  a schema:EducationalOrganization ;
  schema:name "Harvard University" ;
  schema:logo <https://media.licdn.com/...harvard_logo.jpg> ;
  schema:url <https://www.linkedin.com/school/harvard-university> ;
  schema:startDate "1973" ;
  schema:endDate "1975"
] .
```

#### Social Proof
```turtle
:contact_123
  schema:interactionStatistic [
    a schema:InteractionCounter ;
    schema:interactionType schema:FollowAction ;
    schema:userInteractionCount 39559293
  ] ;
  schema:interactionStatistic [
    a schema:InteractionCounter ;
    schema:interactionType schema:ConnectAction ;
    schema:userInteractionCount 500
  ] .
```

#### Location (granular)
```turtle
:contact_123
  schema:address [
    a schema:PostalAddress ;
    schema:addressLocality "Seattle" ;
    schema:addressRegion "Washington" ;
    schema:addressCountry "US"
  ] .
```

#### External Links
```turtle
:contact_123
  foaf:homepage <https://gatesnot.es/sourcecode-li> ;
  schema:url [
    a schema:URL ;
    schema:name "Blog" ;
    schema:url <https://gatesnot.es/sourcecode-li>
  ] .
```

#### Recent Posts (Activity Stream)
```turtle
:contact_123 as:outbox [
  a as:OrderedCollection ;
  as:items (
    [
      a as:Article ;
      schema:headline "What the Gates Foundation hopes to accomplish..." ;
      schema:url <https://www.linkedin.com/pulse/...> ;
      schema:datePublished "2025-12-20T00:00:00Z" ;
      schema:interactionStatistic [
        a schema:InteractionCounter ;
        schema:interactionType schema:LikeAction ;
        schema:userInteractionCount 2650
      ] ;
      schema:commentCount 459
    ]
  )
] .
```

#### Network Connections
```turtle
:contact_123 foaf:knows :contact_melinda_gates .
:contact_123 schema:relatedTo :contact_melinda_gates .

:contact_melinda_gates a schema:Person ;
  foaf:name "Melinda French Gates" ;
  schema:url <https://www.linkedin.com/in/melindagates> .
```

#### Honors & Awards
```turtle
:contact_123 schema:award [
  a schema:Award ;
  schema:name "Presidential Medal of Freedom" ;
  schema:issuedBy "United States Government" ;
  schema:dateAwarded "2016"
] .
```

#### Visual Assets
```turtle
:contact_123
  foaf:img <https://media.licdn.com/...avatar.jpg> ;
  schema:image <https://media.licdn.com/...banner.jpg> .
```

---

## 📝 Implementation Checklist

### Step 1: Schema Changes ✓
- [ ] Add 15+ new fields to contacts table
- [ ] Update TypeScript types
- [ ] Run database migration
- [ ] Verify schema in Railway

### Step 2: Transformation Logic ✓
- [ ] Update `BrightDataLinkedInProfile` interface
- [ ] Update `transformBrightDataResponse()` function
- [ ] Map all 33 top-level fields
- [ ] Extract nested data (logos, links, posts)
- [ ] Add fallback logic for missing fields

### Step 3: Database Save ✓
- [ ] Update `updateContactEnrichment()` signature
- [ ] Save all new fields to database
- [ ] Update `enrichContactBackground()` to pass new data
- [ ] Add validation for JSON fields

### Step 4: RDF Mapping ✓
- [ ] Update `enrichLinkedInProfile()` in enrichment-adapter.ts
- [ ] Add new RDF predicates for all fields
- [ ] Generate triples for experience logos
- [ ] Generate triples for education logos
- [ ] Generate triples for posts/activity
- [ ] Generate triples for peopleAlsoViewed

### Step 5: UI Display ✓
- [ ] Show follower count badge
- [ ] Display company/school logos in lists
- [ ] Show recent posts section
- [ ] Add "People Also Viewed" recommendations
- [ ] Display bio links
- [ ] Show honors & awards

### Step 6: Testing ✓
- [ ] Test with Bill Gates profile
- [ ] Test with Satya Nadella profile
- [ ] Verify all fields save correctly
- [ ] Check RDF graph completeness
- [ ] Test UI rendering

---

## 🎯 Success Metrics

1. **Data Completeness**: 95%+ of available fields captured
2. **RDF Graph Depth**: 100+ triples per enriched contact
3. **UI Enhancement**: Logos, posts, and network visible
4. **No Regressions**: Existing functionality unchanged
5. **Performance**: <2s additional processing time

---

## 🚀 Deployment Plan

1. **Development**: Implement in feature branches
2. **Testing**: Test with 10+ real LinkedIn profiles
3. **Staging**: Deploy to staging environment
4. **Production**: Gradual rollout (25% → 50% → 100%)
5. **Monitoring**: Watch logs for errors, validate data quality

---

## ⚠️ Risks & Mitigations

**Risk 1**: Schema migration breaks existing data
- **Mitigation**: All new fields are nullable, backward compatible

**Risk 2**: JSON parsing errors for complex fields
- **Mitigation**: Wrap all JSON.stringify/parse in try-catch

**Risk 3**: RDF graph becomes too large
- **Mitigation**: Implement pagination, limit posts to 10 most recent

**Risk 4**: UI becomes cluttered
- **Mitigation**: Use collapsible sections, progressive disclosure

---

## 📦 Files to Modify

1. `drizzle/schema.ts` - Schema changes
2. `server/_core/brightdata.ts` - Transformation logic
3. `server/db.ts` - Database save logic
4. `server/enrichment.ts` - Enrichment orchestration
5. `server/enrichment-adapter.ts` - RDF mapping
6. `client/src/pages/ContactDetail.tsx` - UI display
7. `client/src/components/contact/ExperienceList.tsx` - Show logos (NEW)
8. `client/src/components/contact/PostsSection.tsx` - Show posts (NEW)

---

**Ready to begin implementation!**
