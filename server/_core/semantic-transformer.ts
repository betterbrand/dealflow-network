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
import type { TwitterProfile } from "./twitter-provider";

/**
 * Custom DealFlow Network ontology entities for semantic network matching
 */
export interface CapabilityEntity {
  "@type": "dfn:Capability";
  "@id": string;
  name: string;
  confidence: number;
  evidence?: string;
  "dfn:belongsTo": string;
}

export interface NeedEntity {
  "@type": "dfn:Need";
  "@id": string;
  name: string;
  urgency?: "low" | "medium" | "high";
  context?: string;
  "dfn:belongsTo": string;
}

export interface OpportunityEntity {
  "@type": "dfn:Opportunity";
  "@id": string;
  title: string;
  description?: string;
  opportunityType?: string;
  confidence: number;
  "dfn:belongsTo": string;
}

export interface SemanticGraph {
  "@context": string | Record<string, unknown>;
  "@graph": Array<PersonEntity | OrganizationEntity | EventEntity | ProvenanceEntity | CapabilityEntity | NeedEntity | OpportunityEntity>;
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
  const mergedEntities: Array<PersonEntity | OrganizationEntity | EventEntity | ProvenanceEntity | CapabilityEntity | NeedEntity | OpportunityEntity> = [];

  for (const graph of graphs) {
    mergedEntities.push(...graph["@graph"]);
  }

  // TODO: Implement entity deduplication and conflict resolution
  // For now, just combine all entities

  return {
    "@context": {
      "@vocab": "https://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
      "dfn": "https://dealflow.network/ontology#",
    },
    "@graph": mergedEntities,
  };
}

/**
 * Transform Twitter profile into Schema.org + PROV-O JSON-LD
 */
export function transformTwitterToSemanticGraph(
  profile: TwitterProfile,
  profileUrl: string,
  options: TransformOptions
): SemanticGraph {
  const personId = `twitter:${profile.username}`;
  const timestamp = options.timestamp || new Date();

  const graph: Array<PersonEntity | OrganizationEntity | EventEntity | ProvenanceEntity | CapabilityEntity | NeedEntity | OpportunityEntity> = [];

  // Create Person entity
  const person: PersonEntity = {
    "@type": "Person",
    "@id": personId,
    name: profile.name || profile.username,
    url: profileUrl,
    image: profile.profileImageUrl || undefined,
    logo: profile.bannerUrl || undefined,
    knowsAbout: [], // Will be populated from tweet analysis
  };

  // Add bio as description via worksFor hack (schema.org doesn't have description for Person)
  // We'll store it in the identifier array as a custom property
  const identifiers: Array<{ "@type": "PropertyValue"; propertyID: string; value: string }> = [];

  // Add Twitter identifiers
  if (profile.id) {
    identifiers.push({
      "@type": "PropertyValue",
      propertyID: "twitterId",
      value: profile.id,
    });
  }

  identifiers.push({
    "@type": "PropertyValue",
    propertyID: "twitterUsername",
    value: profile.username,
  });

  if (profile.verified) {
    identifiers.push({
      "@type": "PropertyValue",
      propertyID: "twitterVerified",
      value: "true",
    });
  }

  if (profile.bio) {
    identifiers.push({
      "@type": "PropertyValue",
      propertyID: "twitterBio",
      value: profile.bio,
    });
  }

  if (identifiers.length > 0) {
    person.identifier = identifiers;
  }

  // Add location
  if (profile.location) {
    person.address = {
      "@type": "PostalAddress",
      name: profile.location,
    };
  }

  // Add social proof statistics
  const stats: Array<{ "@type": "InteractionCounter"; interactionType: string; userInteractionCount: number }> = [];

  if (profile.followersCount) {
    stats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/FollowAction",
      userInteractionCount: profile.followersCount,
    });
  }

  if (profile.followingCount) {
    stats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/SubscribeAction",
      userInteractionCount: profile.followingCount,
    });
  }

  if (profile.tweetCount) {
    stats.push({
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WriteAction",
      userInteractionCount: profile.tweetCount,
    });
  }

  if (stats.length > 0) {
    person.interactionStatistic = stats;
  }

  // Add website as sameAs link
  if (profile.website) {
    person.sameAs = [profile.website];
  }

  graph.push(person);

  // Add provenance entity
  const provenance: ProvenanceEntity = {
    "@type": "Activity",
    "@id": `activity:${personId}-import-${timestamp.getTime()}`,
    "prov:hadPrimarySource": "Twitter",
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
      "dfn": "https://dealflow.network/ontology#",
    },
    "@graph": graph,
  };
}

/**
 * Analysis data structure from LLM tweet analysis
 */
export interface TwitterAnalysisData {
  capabilities?: Array<{ name: string; confidence: number; evidence?: string }>;
  needs?: Array<{ name: string; urgency?: "low" | "medium" | "high"; context?: string }>;
  opportunities?: Array<{ title: string; description?: string; type?: string; confidence: number }>;
  topics?: string[];
}

/**
 * Extend an existing semantic graph with LLM-derived analysis entities
 * Adds Capability, Need, and Opportunity entities linked to the Person
 */
export function extendGraphWithAnalysis(
  existingGraph: SemanticGraph,
  analysis: TwitterAnalysisData,
  contactId: number
): SemanticGraph {
  const graph = [...existingGraph["@graph"]];

  // Find the Person entity to link to
  const person = graph.find(
    (entity): entity is PersonEntity => entity["@type"] === "Person"
  );

  if (!person) {
    console.warn("[Semantic Transformer] No Person entity found to extend with analysis");
    return existingGraph;
  }

  const personId = person["@id"];
  const timestamp = Date.now();

  // Add capabilities
  if (analysis.capabilities && analysis.capabilities.length > 0) {
    for (let i = 0; i < analysis.capabilities.length; i++) {
      const cap = analysis.capabilities[i];
      const capabilityEntity: CapabilityEntity = {
        "@type": "dfn:Capability",
        "@id": `capability:${contactId}-${i}-${timestamp}`,
        name: cap.name,
        confidence: cap.confidence,
        evidence: cap.evidence,
        "dfn:belongsTo": personId,
      };
      graph.push(capabilityEntity);
    }
  }

  // Add needs
  if (analysis.needs && analysis.needs.length > 0) {
    for (let i = 0; i < analysis.needs.length; i++) {
      const need = analysis.needs[i];
      const needEntity: NeedEntity = {
        "@type": "dfn:Need",
        "@id": `need:${contactId}-${i}-${timestamp}`,
        name: need.name,
        urgency: need.urgency,
        context: need.context,
        "dfn:belongsTo": personId,
      };
      graph.push(needEntity);
    }
  }

  // Add opportunities
  if (analysis.opportunities && analysis.opportunities.length > 0) {
    for (let i = 0; i < analysis.opportunities.length; i++) {
      const opp = analysis.opportunities[i];
      const opportunityEntity: OpportunityEntity = {
        "@type": "dfn:Opportunity",
        "@id": `opportunity:${contactId}-${i}-${timestamp}`,
        title: opp.title,
        description: opp.description,
        opportunityType: opp.type,
        confidence: opp.confidence,
        "dfn:belongsTo": personId,
      };
      graph.push(opportunityEntity);
    }
  }

  // Update Person's knowsAbout with topics
  if (analysis.topics && analysis.topics.length > 0) {
    person.knowsAbout = [...(person.knowsAbout || []), ...analysis.topics];
  }

  return {
    "@context": {
      "@vocab": "https://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
      "dfn": "https://dealflow.network/ontology#",
    },
    "@graph": graph,
  };
}
