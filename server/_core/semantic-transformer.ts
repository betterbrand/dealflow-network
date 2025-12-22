/**
 * Contact-Centric Semantic Transformer
 *
 * Transforms contact data from any source (LinkedIn, Twitter, Telegram, etc.)
 * into unified Schema.org + PROV-O JSON-LD semantic graph.
 *
 * Key Features:
 * - Person-centric (contacts are central entities)
 * - Multi-source support (LinkedIn, Twitter, Telegram, manual)
 * - PROV-O provenance tracking (WHO, WHEN, FROM which source)
 * - Extensible for future data sources
 */

import type { BrightDataLinkedInProfile } from "./brightdata";

export interface SemanticGraph {
  "@context": string | Record<string, unknown>;
  "@graph": Array<PersonEntity | OrganizationEntity | EventEntity | ProvenanceEntity>;
}

export interface PersonEntity {
  "@type": "Person";
  "@id": string;
  name: string;
  givenName?: string;        // NEW: firstName
  familyName?: string;       // NEW: lastName
  jobTitle?: string;
  email?: string;
  telephone?: string;
  url?: string;
  image?: string;

  // NEW: Location (granular)
  address?: {
    "@type": "PostalAddress";
    addressLocality?: string;  // city
    addressCountry?: string;   // countryCode
    name?: string;            // full location string
  };

  // NEW: Social proof
  interactionStatistic?: Array<{
    "@type": "InteractionCounter";
    interactionType: string;
    userInteractionCount: number;
  }>;

  // NEW: Visual assets
  logo?: string;             // bannerImage

  // NEW: External links
  sameAs?: string[];         // bioLinks

  worksFor?: Array<WorksForRelation>;
  alumniOf?: Array<AlumniOfRelation>;
  knowsAbout?: string[];
  knows?: string[];          // Links to other Person entities (peopleAlsoViewed)
  attendedEvent?: string;    // Link to Event entity (optional)

  // NEW: LinkedIn metadata
  identifier?: Array<{
    "@type": "PropertyValue";
    propertyID: string;
    value: string;
  }>;
}

export interface WorksForRelation {
  "@type": "Organization";
  "@id": string;
  name: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;              // NEW: Company LinkedIn URL
  logo?: string;             // NEW: Company logo URL
  identifier?: string;       // NEW: LinkedIn company ID
}

export interface AlumniOfRelation {
  "@type": "EducationalOrganization";
  "@id": string;
  name: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  url?: string;              // NEW: School LinkedIn URL
  logo?: string;             // NEW: School logo URL
}

export interface OrganizationEntity {
  "@type": "Organization";
  "@id": string;
  name: string;
  url?: string;
  description?: string;
  foundingDate?: string;
}

export interface EventEntity {
  "@type": "Event";
  "@id": string;
  name: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  eventType?: string;
}

export interface ProvenanceEntity {
  "@type": "Activity";
  "@id": string;
  "prov:wasAttributedTo"?: string; // User who added
  "prov:generatedAtTime"?: string; // Timestamp
  "prov:hadPrimarySource"?: string; // LinkedIn, Twitter, Telegram, etc.
  "prov:atLocation"?: string; // Event where introduced (optional)
  "prov:generated"?: string; // Link to Person entity
}

export interface TransformOptions {
  source: "LinkedIn" | "Twitter" | "Telegram" | "Manual" | "ASIMOV";
  userId?: number;
  eventId?: string;
  timestamp?: Date;
}

/**
 * Transform LinkedIn profile from Bright Data into Schema.org + PROV-O JSON-LD
 */
export function transformLinkedInToSemanticGraph(
  profile: BrightDataLinkedInProfile,
  profileUrl: string,
  options: TransformOptions
): SemanticGraph {
  const personId = `linkedin:${profileUrl.match(/\/in\/([^\/]+)/)?.[1] || "unknown"}`;
  const timestamp = options.timestamp || new Date();

  const graph: Array<PersonEntity | OrganizationEntity | EventEntity | ProvenanceEntity> = [];

  // Create Person entity
  const person: PersonEntity = {
    "@type": "Person",
    "@id": personId,
    name: profile.name || "Unknown",
    givenName: profile.firstName,
    familyName: profile.lastName,
    jobTitle: profile.headline || profile.position,
    url: profileUrl,
    image: profile.profilePictureUrl || profile.avatar,
    logo: profile.bannerImage,
    knowsAbout: profile.skills || [],
  };

  // Add location (granular)
  if (profile.city || profile.countryCode || profile.location) {
    person.address = {
      "@type": "PostalAddress",
      addressLocality: profile.city,
      addressCountry: profile.countryCode,
      name: profile.location,
    };
  }

  // Add social proof statistics
  const stats: Array<{ "@type": "InteractionCounter"; interactionType: string; userInteractionCount: number }> = [];
  if (profile.followers) {
    stats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/FollowAction",
      userInteractionCount: profile.followers,
    });
  }
  if (profile.connections) {
    stats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/ConnectAction",
      userInteractionCount: profile.connections,
    });
  }
  if (stats.length > 0) {
    person.interactionStatistic = stats;
  }

  // Add external links (bioLinks)
  if (profile.bioLinks && profile.bioLinks.length > 0) {
    person.sameAs = profile.bioLinks.map(link => link.link);
  }

  // Add LinkedIn identifiers
  const identifiers: Array<{ "@type": "PropertyValue"; propertyID: string; value: string }> = [];
  if (profile.linkedinId) {
    identifiers.push({
      "@type": "PropertyValue",
      propertyID: "linkedinId",
      value: profile.linkedinId,
    });
  }
  if (profile.linkedinNumId) {
    identifiers.push({
      "@type": "PropertyValue",
      propertyID: "linkedinNumId",
      value: profile.linkedinNumId,
    });
  }
  if (identifiers.length > 0) {
    person.identifier = identifiers;
  }

  // Add peopleAlsoViewed as knows relationship
  if (profile.peopleAlsoViewed && profile.peopleAlsoViewed.length > 0) {
    person.knows = profile.peopleAlsoViewed
      .filter(p => p && p.profileLink) // Filter out entries without profileLink
      .map(p => `linkedin:${p.profileLink.match(/\/in\/([^\/]+)/)?.[1] || "unknown"}`);
  }

  // Create separate Organization entities for work experience
  const worksForIds: string[] = [];
  if (profile.experience && profile.experience.length > 0) {
    profile.experience
      .filter(exp => exp.company)
      .forEach((exp, index) => {
        const orgId = `org:${exp.company.toLowerCase().replace(/\s+/g, "-")}-${index}`;
        worksForIds.push(orgId);

        const org: OrganizationEntity & { logo?: string; identifier?: string } = {
          "@type": "Organization",
          "@id": orgId,
          name: exp.company,
          description: exp.description || exp.descriptionHtml,
          url: exp.url,              // NEW: Company LinkedIn URL
        };

        // NEW: Add company logo
        if (exp.companyLogoUrl) {
          org.logo = exp.companyLogoUrl;
        }

        // NEW: Add LinkedIn company ID
        if (exp.companyId) {
          org.identifier = exp.companyId;
        }

        graph.push(org);
      });
  }

  if (worksForIds.length > 0) {
    person.worksFor = worksForIds.map(id => ({ "@id": id } as any));
  }

  // Create separate EducationalOrganization entities for education
  const alumniOfIds: string[] = [];
  if (profile.education && profile.education.length > 0) {
    profile.education
      .filter(edu => edu.school)
      .forEach((edu, index) => {
        const eduId = `edu:${edu.school.toLowerCase().replace(/\s+/g, "-")}-${index}`;
        alumniOfIds.push(eduId);

        const school: OrganizationEntity & { logo?: string; url?: string } = {
          "@type": "Organization",
          "@id": eduId,
          name: edu.school,
          description: edu.degree && edu.field ? `${edu.degree} in ${edu.field}` : (edu.degree || edu.field),
        };

        // NEW: Add school logo
        if (edu.instituteLogoUrl) {
          school.logo = edu.instituteLogoUrl;
        }

        // NEW: Add school LinkedIn URL
        if (edu.url) {
          school.url = edu.url;
        }

        graph.push(school);
      });
  }

  if (alumniOfIds.length > 0) {
    person.alumniOf = alumniOfIds.map(id => ({ "@id": id } as any));
  }

  // Add event attendance if provided
  if (options.eventId) {
    person.attendedEvent = `event:${options.eventId}`;
  }

  graph.push(person);

  // Add provenance entity
  const provenance: ProvenanceEntity = {
    "@type": "Activity",
    "@id": `activity:${personId}-import-${timestamp.getTime()}`,
    "prov:hadPrimarySource": options.source,
    "prov:generatedAtTime": timestamp.toISOString(),
    "prov:generated": personId,
  };

  if (options.userId) {
    provenance["prov:wasAttributedTo"] = `user:${options.userId}`;
  }

  if (options.eventId) {
    provenance["prov:atLocation"] = `event:${options.eventId}`;
  }

  graph.push(provenance);

  return {
    "@context": {
      "@vocab": "https://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
    },
    "@graph": graph,
  };
}

/**
 * Parse semantic graph back into structured contact data
 * (for querying and display)
 */
export function parseSemanticGraph(semanticGraph: SemanticGraph): {
  person: PersonEntity | null;
  organizations: OrganizationEntity[];
  provenance: ProvenanceEntity | null;
} {
  const person = semanticGraph["@graph"].find(
    (entity) => entity["@type"] === "Person"
  ) as PersonEntity | undefined;

  const organizations = semanticGraph["@graph"].filter(
    (entity) => entity["@type"] === "Organization"
  ) as OrganizationEntity[];

  const provenance = semanticGraph["@graph"].find(
    (entity) => entity["@type"] === "Activity"
  ) as ProvenanceEntity | undefined;

  return {
    person: person || null,
    organizations,
    provenance: provenance || null,
  };
}

/**
 * Merge multiple semantic graphs (for combining data from multiple sources)
 */
export function mergeSemanticGraphs(graphs: SemanticGraph[]): SemanticGraph {
  const mergedEntities: Array<PersonEntity | OrganizationEntity | EventEntity | ProvenanceEntity> = [];

  for (const graph of graphs) {
    mergedEntities.push(...graph["@graph"]);
  }

  // TODO: Implement entity deduplication and conflict resolution
  // For now, just combine all entities

  return {
    "@context": {
      "@vocab": "https://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
    },
    "@graph": mergedEntities,
  };
}
