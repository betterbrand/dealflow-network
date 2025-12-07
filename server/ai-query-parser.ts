import { invokeLLM } from "./_core/llm";

/**
 * Structured query schema for LLM to extract search criteria from natural language
 */
export interface ParsedQuery {
  intent: "search" | "introduction" | "analysis" | "recommendation";
  filters: {
    companies?: string[];
    roles?: string[];
    locations?: string[];
    industries?: string[];
    names?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
  };
  relationshipType?: string;
  targetPerson?: {
    name?: string;
    company?: string;
    role?: string;
  };
  analysisType?: "network_density" | "top_connectors" | "clusters" | "bridges";
  limit?: number;
}

/**
 * Parse natural language query using LLM with structured output
 */
export async function parseNaturalLanguageQuery(
  query: string
): Promise<ParsedQuery> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a network query parser. Extract structured search criteria from natural language questions about a professional network.

Intent types:
- "search": Find specific contacts (e.g., "Who do I know at Microsoft?")
- "introduction": Find introduction paths (e.g., "Who can introduce me to someone at OpenAI?")
- "analysis": Analyze network structure (e.g., "Who are my top connectors?")
- "recommendation": Get recommendations (e.g., "Suggest VCs I should meet")

Extract relevant filters:
- companies: Company names mentioned
- roles: Job titles or roles (CEO, CTO, founder, VC, engineer, etc.)
- locations: Cities, states, countries
- industries: Industry sectors (AI, fintech, healthcare, etc.)
- names: Specific person names
- dateRange: Time periods (e.g., "in 2024", "last month")
- relationshipType: Type of relationship (colleague, mentor, investor, etc.)

For introduction queries, extract targetPerson details.
For analysis queries, identify analysisType.`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "parsed_query",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["search", "introduction", "analysis", "recommendation"],
              description: "The primary intent of the query",
            },
            filters: {
              type: "object",
              properties: {
                companies: {
                  type: "array",
                  items: { type: "string" },
                  description: "Company names to filter by",
                },
                roles: {
                  type: "array",
                  items: { type: "string" },
                  description: "Job titles or roles to filter by",
                },
                locations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Locations to filter by",
                },
                industries: {
                  type: "array",
                  items: { type: "string" },
                  description: "Industries to filter by",
                },
                names: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific person names",
                },
                dateRange: {
                  type: "object",
                  properties: {
                    start: { type: "string" },
                    end: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
            relationshipType: {
              type: "string",
              description: "Type of relationship if specified",
            },
            targetPerson: {
              type: "object",
              properties: {
                name: { type: "string" },
                company: { type: "string" },
                role: { type: "string" },
              },
              additionalProperties: false,
            },
            analysisType: {
              type: "string",
              enum: ["network_density", "top_connectors", "clusters", "bridges"],
            },
            limit: {
              type: "integer",
              description: "Maximum number of results to return",
            },
          },
          required: ["intent", "filters"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from LLM");
  }

  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  return JSON.parse(contentStr) as ParsedQuery;
}

/**
 * Generate a human-readable explanation of the parsed query
 */
export function explainParsedQuery(parsed: ParsedQuery): string {
  const parts: string[] = [];

  if (parsed.intent === "search") {
    parts.push("Searching for contacts");
  } else if (parsed.intent === "introduction") {
    parts.push("Finding introduction paths");
  } else if (parsed.intent === "analysis") {
    parts.push("Analyzing your network");
  } else if (parsed.intent === "recommendation") {
    parts.push("Getting recommendations");
  }

  const filters: string[] = [];
  if (parsed.filters.companies?.length) {
    filters.push(`at ${parsed.filters.companies.join(", ")}`);
  }
  if (parsed.filters.roles?.length) {
    filters.push(`with role: ${parsed.filters.roles.join(", ")}`);
  }
  if (parsed.filters.locations?.length) {
    filters.push(`in ${parsed.filters.locations.join(", ")}`);
  }
  if (parsed.filters.industries?.length) {
    filters.push(`in ${parsed.filters.industries.join(", ")} industry`);
  }
  if (parsed.filters.names?.length) {
    filters.push(`named ${parsed.filters.names.join(", ")}`);
  }
  if (parsed.filters.dateRange) {
    if (parsed.filters.dateRange.start && parsed.filters.dateRange.end) {
      filters.push(`from ${parsed.filters.dateRange.start} to ${parsed.filters.dateRange.end}`);
    } else if (parsed.filters.dateRange.start) {
      filters.push(`since ${parsed.filters.dateRange.start}`);
    } else if (parsed.filters.dateRange.end) {
      filters.push(`until ${parsed.filters.dateRange.end}`);
    }
  }

  if (filters.length > 0) {
    parts.push(filters.join(" "));
  }

  if (parsed.targetPerson) {
    const target: string[] = [];
    if (parsed.targetPerson.name) target.push(parsed.targetPerson.name);
    if (parsed.targetPerson.company) target.push(`at ${parsed.targetPerson.company}`);
    if (parsed.targetPerson.role) target.push(`(${parsed.targetPerson.role})`);
    parts.push(`to reach: ${target.join(" ")}`);
  }

  if (parsed.analysisType) {
    parts.push(`(${parsed.analysisType.replace("_", " ")})`);
  }

  if (parsed.limit) {
    parts.push(`(limit: ${parsed.limit})`);
  }

  return parts.join(" ");
}
