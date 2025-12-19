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
  jobTitle?: string;
  email?: string;
  telephone?: string;
  url?: string;
  image?: string;
  worksFor?: Array<WorksForRelation>;
  alumniOf?: Array<AlumniOfRelation>;
  knowsAbout?: string[];
  knows?: string[]; // Links to other Person entities
  attendedEvent?: string; // Link to Event entity (optional)
}

export interface WorksForRelation {
  "@type": "Organization";
  "@id": string;
  name: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface AlumniOfRelation {
  "@type": "EducationalOrganization";
  "@id": string;
  name: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
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
    jobTitle: profile.headline,
    url: profileUrl,
    image: profile.profilePictureUrl,
    knowsAbout: profile.skills || [],
  };

  // Add work experience as worksFor relationships
  if (profile.experience && profile.experience.length > 0) {
    person.worksFor = profile.experience
      .filter(exp => exp.company) // Only include if company name exists
      .map((exp, index) => ({
        "@type": "Organization" as const,
        "@id": `org:${exp.company.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        name: exp.company,
        jobTitle: exp.title,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
      }));
  }

  // Add education as alumniOf relationships
  if (profile.education && profile.education.length > 0) {
    person.alumniOf = profile.education
      .filter(edu => edu.school) // Only include if school name exists
      .map((edu, index) => ({
        "@type": "EducationalOrganization" as const,
        "@id": `edu:${edu.school.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        name: edu.school,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate,
      }));
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
