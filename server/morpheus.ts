/**
 * Morpheus AI Extraction Service
 * Uses Morpheus AI API (OpenAI-compatible) to extract structured data from conversations
 */

import { invokeLLM } from "./_core/llm";

export interface ExtractedContact {
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  location?: string;
  telegramUsername?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  conversationSummary?: string;
  actionItems?: string;
  sentiment?: "positive" | "neutral" | "negative";
  interestLevel?: "high" | "medium" | "low";
  eventName?: string;
  eventLocation?: string;
  eventDate?: string;
}

/**
 * Extract structured contact information from a Telegram conversation
 */
export async function extractContactFromConversation(
  conversationText: string
): Promise<ExtractedContact> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at extracting structured contact information from networking conversations. 
Extract the following information from the conversation:
- Names of both people
- Companies and roles
- Contact information (email, phone, Telegram username)
- Social media URLs (LinkedIn, Twitter)
- Event details (name, location, date)
- Conversation summary
- Action items or follow-ups
- Sentiment (positive, neutral, negative)
- Interest level (high, medium, low)

Return ONLY valid JSON matching the schema provided. If information is not mentioned, omit the field.`,
      },
      {
        role: "user",
        content: `Extract contact information from this conversation:\n\n${conversationText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contact_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name of the contact" },
            company: { type: "string", description: "Company name" },
            role: { type: "string", description: "Job title or role" },
            email: { type: "string", description: "Email address" },
            phone: { type: "string", description: "Phone number" },
            location: { type: "string", description: "City or country" },
            telegramUsername: { type: "string", description: "Telegram username without @" },
            linkedinUrl: { type: "string", description: "LinkedIn profile URL" },
            twitterUrl: { type: "string", description: "Twitter/X profile URL" },
            conversationSummary: { type: "string", description: "Brief summary of the conversation" },
            actionItems: { type: "string", description: "Follow-up actions or next steps" },
            sentiment: { 
              type: "string", 
              enum: ["positive", "neutral", "negative"],
              description: "Overall sentiment of the interaction" 
            },
            interestLevel: { 
              type: "string", 
              enum: ["high", "medium", "low"],
              description: "Level of interest in potential partnership" 
            },
            eventName: { type: "string", description: "Name of the networking event" },
            eventLocation: { type: "string", description: "Location of the event" },
            eventDate: { type: "string", description: "Date of the event (YYYY-MM-DD format)" },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content returned from Morpheus AI");
  }

  const extracted: ExtractedContact = JSON.parse(content);
  return extracted;
}

/**
 * Extract multiple contacts from a conversation (if multiple people are mentioned)
 */
export async function extractMultipleContacts(
  conversationText: string
): Promise<ExtractedContact[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at extracting structured contact information from networking conversations.
Extract information for ALL people mentioned in the conversation (excluding the user themselves).
Return an array of contact objects, one for each person.`,
      },
      {
        role: "user",
        content: `Extract all contacts from this conversation:\n\n${conversationText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "multiple_contacts_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  company: { type: ["string", "null"] },
                  role: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  phone: { type: ["string", "null"] },
                  location: { type: ["string", "null"] },
                  telegramUsername: { type: ["string", "null"] },
                  linkedinUrl: { type: ["string", "null"] },
                  twitterUrl: { type: ["string", "null"] },
                  conversationSummary: { type: ["string", "null"] },
                  actionItems: { type: ["string", "null"] },
                  sentiment: { type: ["string", "null"], enum: ["positive", "neutral", "negative", null] },
                  interestLevel: { type: ["string", "null"], enum: ["high", "medium", "low", null] },
                  eventName: { type: ["string", "null"] },
                  eventLocation: { type: ["string", "null"] },
                  eventDate: { type: ["string", "null"] },
                },
                required: ["name", "company", "role", "email", "phone", "location", "telegramUsername", "linkedinUrl", "twitterUrl", "conversationSummary", "actionItems", "sentiment", "interestLevel", "eventName", "eventLocation", "eventDate"],
                additionalProperties: false,
              },
            },
          },
          required: ["contacts"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content returned from Morpheus AI");
  }

  const result = JSON.parse(content);
  return result.contacts || [];
}

/**
 * Extract contacts from screenshot OCR text
 * This is optimized for text extracted from screenshots, which may contain OCR artifacts
 */
export async function extractContactsFromScreenshot(
  ocrText: string
): Promise<ExtractedContact[]> {
  console.log('[Morpheus] Extracting contacts from screenshot OCR text...');

  // Use the existing extractMultipleContacts function
  // The OCR text is already processed, so we just need to extract contacts
  try {
    const contacts = await extractMultipleContacts(ocrText);
    console.log(`[Morpheus] Successfully extracted ${contacts.length} contact(s) from screenshot`);
    return contacts;
  } catch (error) {
    console.error('[Morpheus] Failed to extract contacts from screenshot:', error);
    throw new Error(
      `Failed to extract contacts from screenshot: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'The screenshot text may not contain valid contact information.'
    );
  }
}

/**
 * Determine if a conversation contains networking content worth extracting
 */
export async function isNetworkingConversation(conversationText: string): Promise<boolean> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "Determine if this conversation is a networking/business introduction. Return true if it contains introductions, business discussions, or professional connections. Return false for casual chat.",
      },
      {
        role: "user",
        content: conversationText,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "networking_check",
        strict: true,
        schema: {
          type: "object",
          properties: {
            isNetworking: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["isNetworking", "reason"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    return false;
  }

  const result = JSON.parse(content);
  return result.isNetworking;
}
