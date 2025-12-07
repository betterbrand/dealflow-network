import { invokeLLM } from "../_core/llm";

export type QueryIntent = "find" | "filter" | "recommend" | "analyze" | "introduction_path";

export interface ParsedQuery {
  intent: QueryIntent;
  filters: {
    companies?: string[];
    roles?: string[];
    locations?: string[];
    names?: string[];
    relationshipTypes?: string[];
    timeframe?: string;
  };
  introductionPath?: {
    from?: string;
    to: string;
  };
}

export interface QueryParseResult {
  parsed: ParsedQuery;
  explanation: string;
}

/**
 * Parse natural language query using LLM
 */
export async function parseQuery(query: string): Promise<QueryParseResult> {
  const systemPrompt = `You are a network query parser. Parse natural language queries about professional networks into structured filters.

Intent types:
- "find": Finding specific contacts (e.g., "Who do I know at Microsoft?")
- "filter": Filtering by attributes (e.g., "Show me all CEOs")
- "recommend": Suggesting connections (e.g., "Who should I talk to about AI?")
- "analyze": Network analysis (e.g., "How many people work at Google?")
- "introduction_path": Finding connection paths (e.g., "Who can introduce me to X?")

Extract filters:
- companies: Company names mentioned
- roles: Job titles or roles (CEO, founder, engineer, etc.)
- locations: Cities, countries, regions
- names: Specific person names
- relationshipTypes: Types of relationships (colleague, mentor, friend, etc.)
- timeframe: Time references (2024, last year, recently, etc.)

For introduction_path queries, extract:
- from: The starting person (if specified, otherwise null)
- to: The target person or company

Return JSON with this exact structure:
{
  "intent": "find" | "filter" | "recommend" | "analyze" | "introduction_path",
  "filters": {
    "companies": ["company1", "company2"],
    "roles": ["role1"],
    "locations": ["location1"],
    "names": ["name1"],
    "relationshipTypes": ["type1"],
    "timeframe": "description"
  },
  "introductionPath": {
    "from": "person name or null",
    "to": "target person or company"
  },
  "explanation": "Brief explanation of what the query is asking for"
}

Only include filters that are explicitly mentioned in the query.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "query_parse",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["find", "filter", "recommend", "analyze", "introduction_path"],
            },
            filters: {
              type: "object",
              properties: {
                companies: {
                  type: "array",
                  items: { type: "string" },
                },
                roles: {
                  type: "array",
                  items: { type: "string" },
                },
                locations: {
                  type: "array",
                  items: { type: "string" },
                },
                names: {
                  type: "array",
                  items: { type: "string" },
                },
                relationshipTypes: {
                  type: "array",
                  items: { type: "string" },
                },
                timeframe: {
                  type: "string",
                },
              },
              required: [],
              additionalProperties: false,
            },
            introductionPath: {
              type: "object",
              properties: {
                from: {
                  type: ["string", "null"],
                },
                to: {
                  type: "string",
                },
              },
              required: ["to"],
              additionalProperties: false,
            },
            explanation: {
              type: "string",
            },
          },
          required: ["intent", "filters", "explanation"],
          additionalProperties: false,
        },
      },
    },
  });

  if (!response || !response.choices || response.choices.length === 0) {
    throw new Error("Invalid response from LLM");
  }

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from LLM");
  }

  const result = JSON.parse(content);
  
  return {
    parsed: {
      intent: result.intent,
      filters: result.filters || {},
      introductionPath: result.introductionPath,
    },
    explanation: result.explanation,
  };
}
