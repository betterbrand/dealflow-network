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
  console.log('[parseQuery] Starting query parsing for:', query);
  
  try {
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
                  type: "string",
                },
                to: {
                  type: "string",
                },
              },
              required: [],
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

    console.log('[parseQuery] LLM response received:', JSON.stringify(response, null, 2));

    if (!response) {
      console.error('[parseQuery] No response from LLM');
      throw new Error("No response from LLM");
    }

    if (!response.choices || !Array.isArray(response.choices)) {
      console.error('[parseQuery] Invalid response structure - missing or invalid choices array:', response);
      throw new Error("Invalid response structure from LLM");
    }

    if (response.choices.length === 0) {
      console.error('[parseQuery] Empty choices array in LLM response:', response);
      throw new Error("Empty response from LLM");
    }

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      console.error('[parseQuery] Invalid choice structure:', choice);
      throw new Error("Invalid message structure from LLM");
    }

    const content = choice.message.content;
    if (!content) {
      console.error('[parseQuery] No content in LLM response:', choice.message);
      throw new Error("No content in LLM response");
    }

    if (typeof content !== 'string') {
      console.error('[parseQuery] Content is not a string:', typeof content, content);
      throw new Error("LLM response content is not a string");
    }

    console.log('[parseQuery] Parsing JSON content:', content);
    const result = JSON.parse(content);
    
    return {
      parsed: {
        intent: result.intent,
        filters: result.filters || {},
        introductionPath: result.introductionPath,
      },
      explanation: result.explanation,
    };
  } catch (error) {
    console.error('[parseQuery] Error during query parsing:', error);
    if (error instanceof Error) {
      console.error('[parseQuery] Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Generate follow-up question suggestions based on query and results
 */
export async function generateFollowUpQuestions(
  originalQuery: string,
  parsed: ParsedQuery,
  resultCount: number
): Promise<string[]> {
  try {
    const systemPrompt = `You are a helpful assistant that suggests follow-up questions for network queries.

Given an original query, its parsed intent/filters, and the number of results found, suggest 3-5 relevant follow-up questions that would help the user explore their network more deeply.

Guidelines:
- Make questions specific and actionable
- Build on the original query context
- Suggest different angles: narrowing down, expanding scope, finding connections, analyzing patterns
- Use natural language that matches the user's query style
- If results are empty, suggest broader queries
- If results are many, suggest ways to narrow down or analyze

Return JSON with this structure:
{
  "questions": ["question 1", "question 2", "question 3", "question 4", "question 5"]
}`;

    const userPrompt = `Original query: "${originalQuery}"
Intent: ${parsed.intent}
Filters: ${JSON.stringify(parsed.filters)}
Results found: ${resultCount}

Suggest follow-up questions:`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "followup_questions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 5,
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    });

    if (!response?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from LLM");
    }

    const content = response.choices[0].message.content;
    if (typeof content !== 'string') {
      throw new Error("LLM response content is not a string");
    }

    const result = JSON.parse(content);
    return result.questions || [];
  } catch (error) {
    console.error('[generateFollowUpQuestions] Error:', error);
    // Return fallback questions if LLM fails
    return [
      "Show me their connections",
      "Find people in similar roles",
      "Who else works at these companies?",
    ];
  }
}
