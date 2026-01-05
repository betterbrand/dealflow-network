import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type LLMProvider = "mor-org" | "anthropic" | "openai-legacy";

export type ProviderConfig = {
  provider: LLMProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
};

export type InvokeLLMOptions = {
  model?: string;
  temperature?: number;
  apiUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  enableFallback?: boolean;
  fallbackProvider?: LLMProvider;
};

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://api.openai.com/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

/**
 * Convert OpenAI-format request to Anthropic format
 */
function convertToAnthropicFormat(params: InvokeParams, options: InvokeLLMOptions) {
  const { messages } = params;

  // Anthropic requires system message separate from user messages
  const systemMessage = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");

  return {
    model: options.model || "claude-sonnet-3-5-20240229",
    max_tokens: options.maxTokens || params.maxTokens || params.max_tokens || 16384,
    temperature: options.temperature,
    system: systemMessage?.content,
    messages: userMessages.map(msg => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (typeof c === "string") return { type: "text", text: c };
            if (c.type === "text") return { type: "text", text: c.text };
            if (c.type === "image_url") return { type: "image", source: { type: "url", url: c.image_url.url } };
            return c;
          })
        : msg.content
    }))
  };
}

/**
 * Convert Anthropic response to OpenAI format
 */
function convertFromAnthropicFormat(anthropicResponse: any): InvokeResult {
  return {
    id: anthropicResponse.id || "anthropic-response",
    created: Date.now(),
    model: anthropicResponse.model,
    choices: [{
      index: 0,
      message: {
        role: "assistant" as Role,
        content: anthropicResponse.content[0]?.text || "",
      },
      finish_reason: anthropicResponse.stop_reason === "end_turn" ? "stop" : anthropicResponse.stop_reason,
    }],
    usage: {
      prompt_tokens: anthropicResponse.usage?.input_tokens || 0,
      completion_tokens: anthropicResponse.usage?.output_tokens || 0,
      total_tokens: (anthropicResponse.usage?.input_tokens || 0) + (anthropicResponse.usage?.output_tokens || 0),
    },
  };
}

export async function invokeLLM(
  params: InvokeParams,
  options?: InvokeLLMOptions
): Promise<InvokeResult> {
  // Determine provider configuration
  const primaryProvider: ProviderConfig = {
    provider: "mor-org",
    apiUrl: options?.apiUrl || "https://api.mor.org/api/v1/chat/completions",
    apiKey: options?.apiKey || ENV.morOrgApiKey,
    model: options?.model || "auto",
  };

  try {
    return await invokeLLMWithProvider(params, options, primaryProvider);
  } catch (error: any) {
    // Check if fallback is enabled and available
    const shouldFallback =
      options?.enableFallback !== false &&
      ENV.anthropicApiKey &&
      isFallbackEligibleError(error);

    if (!shouldFallback) {
      throw error;
    }

    console.warn("[LLM] Primary provider (mor.org) failed, falling back to Anthropic:", error.message);

    const fallbackProvider: ProviderConfig = {
      provider: "anthropic",
      apiUrl: "https://api.anthropic.com/v1/messages",
      apiKey: ENV.anthropicApiKey,
      model: mapToAnthropicModel(options?.model || "auto"),
    };

    try {
      return await invokeLLMWithProvider(params, options, fallbackProvider);
    } catch (fallbackError: any) {
      console.error("[LLM] Fallback provider (Anthropic) also failed:", fallbackError.message);
      throw new Error(`All LLM providers failed. Primary: ${error.message}, Fallback: ${fallbackError.message}`);
    }
  }
}

/**
 * Invoke LLM with a specific provider
 */
async function invokeLLMWithProvider(
  params: InvokeParams,
  options: InvokeLLMOptions | undefined,
  provider: ProviderConfig
): Promise<InvokeResult> {
  if (provider.provider === "anthropic") {
    return await invokeAnthropic(params, options, provider);
  }

  // mor.org and OpenAI-compatible providers use the same format
  return await invokeMorOrg(params, options, provider);
}

/**
 * Invoke mor.org or OpenAI-compatible API
 */
async function invokeMorOrg(
  params: InvokeParams,
  options: InvokeLLMOptions | undefined,
  provider: ProviderConfig
): Promise<InvokeResult> {
  const normalizedMessages = params.messages.map(normalizeMessage);
  const normalizedToolChoice = normalizeToolChoice(
    params.toolChoice || params.tool_choice,
    params.tools
  );

  const payload: any = {
    model: provider.model,
    messages: normalizedMessages,
  };

  if (params.tools && params.tools.length > 0) {
    payload.tools = params.tools;
    if (normalizedToolChoice) {
      payload.tool_choice = normalizedToolChoice;
    }
  }

  payload.max_tokens = options?.maxTokens || params.maxTokens || params.max_tokens || 16384;

  if (options?.temperature !== undefined) {
    payload.temperature = options.temperature;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat: params.responseFormat,
    response_format: params.response_format,
    outputSchema: params.outputSchema,
    output_schema: params.output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(provider.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LLM] Error from mor.org:", response.status, errorText);
    throw new Error(`mor.org API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result as InvokeResult;
}

/**
 * Invoke Anthropic API
 */
async function invokeAnthropic(
  params: InvokeParams,
  options: InvokeLLMOptions | undefined,
  provider: ProviderConfig
): Promise<InvokeResult> {
  const anthropicPayload = convertToAnthropicFormat(params, { ...options, model: provider.model } as InvokeLLMOptions);

  const response = await fetch(provider.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(anthropicPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LLM] Error from Anthropic:", response.status, errorText);
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return convertFromAnthropicFormat(result);
}

/**
 * Determine if error is eligible for fallback
 */
function isFallbackEligibleError(error: any): boolean {
  const message = error.message?.toLowerCase() || "";

  // Fallback on infrastructure/availability errors
  if (message.includes("500") || message.includes("503") || message.includes("timeout")) return true;
  if (message.includes("429") || message.includes("rate limit")) return true;
  if (message.includes("401") || message.includes("403") || message.includes("authentication")) return true;
  if (message.includes("404") && message.includes("model")) return true;

  // Do NOT fallback on content/validation errors
  if (message.includes("400")) return false;
  if (message.includes("content policy")) return false;

  return false;
}

/**
 * Map mor.org model names to Anthropic equivalents
 */
function mapToAnthropicModel(model: string): string {
  const mapping: Record<string, string> = {
    "auto": "claude-sonnet-3-5-20240229",
    "gpt-4o": "claude-sonnet-3-5-20240229",
    "gpt-4o-mini": "claude-sonnet-3-5-20240229",
    "claude-sonnet-3.5": "claude-sonnet-3-5-20240229",
    "claude-opus-3.5": "claude-opus-3-5-20241022",
  };

  return mapping[model] || "claude-sonnet-3-5-20240229";
}
