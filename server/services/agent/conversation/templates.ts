/**
 * Response templates for different scenarios and tones
 * Templates provide consistency while LLM personalizes
 */

import type { AgentTone } from "@shared/_core/agent-types";

export interface ResponseTemplate {
  id: string;
  scenario: string;
  toneVariants: Partial<Record<AgentTone, string[]>>;
  placeholders: string[];
}

/**
 * Response templates organized by scenario
 */
export const TEMPLATES: ResponseTemplate[] = [
  // Path found - high confidence
  {
    id: "path_found_strong",
    scenario: "introduction_path_found_high_confidence",
    toneVariants: {
      excited: [
        "Great news! I found a solid path to {{targetName}}.",
        "I've got a strong connection path for you to {{targetName}}!",
      ],
      neutral: [
        "I found a path to {{targetName}} through your network.",
        "Here's a connection path to {{targetName}}.",
      ],
      cautious: [
        "I found a possible path to {{targetName}}, though you may want to verify the relationship strengths.",
      ],
    },
    placeholders: ["{{targetName}}", "{{pathDescription}}", "{{hops}}"],
  },

  // Path found - low confidence
  {
    id: "path_found_weak",
    scenario: "introduction_path_found_low_confidence",
    toneVariants: {
      cautious: [
        "I found a potential path to {{targetName}}, but the connections seem weaker.",
        "There's a possible route to {{targetName}}, though it may need some nurturing first.",
      ],
      neutral: [
        "I found a path to {{targetName}}, but the relationship strength is lower than usual.",
      ],
    },
    placeholders: ["{{targetName}}", "{{pathDescription}}", "{{hops}}"],
  },

  // No path found
  {
    id: "no_path",
    scenario: "introduction_path_not_found",
    toneVariants: {
      empathetic: [
        "I couldn't find a direct path to {{targetName}} in your current network.",
        "Unfortunately, I don't see a clear connection to {{targetName}} right now.",
      ],
      neutral: [
        "No direct path to {{targetName}} found in your network.",
      ],
      curious: [
        "I couldn't find {{targetName}} in your network. Would you like me to search for people at their company instead?",
      ],
    },
    placeholders: ["{{targetName}}", "{{targetCompany}}"],
  },

  // Connection discovered
  {
    id: "connection_found",
    scenario: "connection_discovered",
    toneVariants: {
      excited: [
        "I discovered a connection! {{contact1Name}} and {{contact2Name}} likely know each other.",
        "Good find! It looks like {{contact1Name}} and {{contact2Name}} are connected.",
      ],
      neutral: [
        "{{contact1Name}} and {{contact2Name}} appear to be connected.",
      ],
      cautious: [
        "{{contact1Name}} and {{contact2Name}} might know each other, based on {{reason}}.",
      ],
    },
    placeholders: ["{{contact1Name}}", "{{contact2Name}}", "{{reason}}"],
  },

  // Greeting response
  {
    id: "greeting",
    scenario: "greeting",
    toneVariants: {
      neutral: [
        "Hi! I'm here to help you explore your network. What would you like to know?",
        "Hello! I can help you find connections, discover paths, and analyze your network. What can I help with?",
      ],
      excited: [
        "Hey there! Ready to explore your network? I can find connections, paths to anyone, or analyze relationships.",
      ],
    },
    placeholders: [],
  },

  // Need clarification
  {
    id: "need_clarification",
    scenario: "ambiguous_query",
    toneVariants: {
      curious: [
        "I want to make sure I understand correctly. When you say '{{term}}', do you mean:",
        "Just to clarify - are you looking for:",
      ],
      neutral: [
        "I need a bit more information. Could you specify:",
      ],
    },
    placeholders: ["{{term}}", "{{options}}"],
  },

  // Agent status update
  {
    id: "status_scanning",
    scenario: "background_scan_progress",
    toneVariants: {
      neutral: [
        "I'm analyzing your network. So far, I've explored {{explored}} contacts and found {{findings}} potential connections.",
        "Still scanning... {{explored}} contacts analyzed, {{findings}} discoveries so far.",
      ],
      excited: [
        "Making good progress! Found {{findings}} interesting connections across {{explored}} contacts.",
      ],
    },
    placeholders: ["{{explored}}", "{{findings}}"],
  },

  // Agent paused
  {
    id: "agent_paused",
    scenario: "agent_control_paused",
    toneVariants: {
      neutral: [
        "Okay, I've paused. Let me know when you'd like me to continue.",
        "Paused. I'll be here when you're ready to continue.",
      ],
    },
    placeholders: [],
  },

  // Agent resumed
  {
    id: "agent_resumed",
    scenario: "agent_control_resumed",
    toneVariants: {
      neutral: [
        "Resuming where we left off...",
        "Back at it! Continuing the network analysis.",
      ],
    },
    placeholders: [],
  },

  // Error recovery
  {
    id: "error_recovery",
    scenario: "error_occurred",
    toneVariants: {
      empathetic: [
        "I ran into an issue while processing that. Let me try a different approach.",
        "Something went wrong on my end. Here are some alternatives:",
      ],
      cautious: [
        "I wasn't able to complete that request. Would you like to try one of these instead:",
      ],
    },
    placeholders: ["{{alternatives}}"],
  },

  // No results but suggestions
  {
    id: "no_results_suggestions",
    scenario: "no_results_with_alternatives",
    toneVariants: {
      empathetic: [
        "I didn't find what you were looking for, but here are some related options:",
      ],
      curious: [
        "No exact matches, but I noticed some related connections. Would any of these help?",
      ],
    },
    placeholders: ["{{suggestions}}"],
  },
];

/**
 * Get template by scenario
 */
export function getTemplate(scenario: string): ResponseTemplate | undefined {
  return TEMPLATES.find((t) => t.scenario === scenario);
}

/**
 * Get template variant for a specific tone
 */
export function getTemplateVariant(
  template: ResponseTemplate,
  tone: AgentTone
): string {
  // Try exact tone match
  const variants = template.toneVariants[tone];
  if (variants && variants.length > 0) {
    return variants[Math.floor(Math.random() * variants.length)];
  }

  // Fall back to neutral
  const neutral = template.toneVariants.neutral;
  if (neutral && neutral.length > 0) {
    return neutral[Math.floor(Math.random() * neutral.length)];
  }

  // Fall back to any available tone
  for (const toneKey of Object.keys(template.toneVariants) as AgentTone[]) {
    const fallback = template.toneVariants[toneKey];
    if (fallback && fallback.length > 0) {
      return fallback[0];
    }
  }

  return "";
}

/**
 * Interpolate placeholders in template
 */
export function interpolateTemplate(
  template: string,
  values: Record<string, string | number | undefined>
): string {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, "g"), String(value ?? ""));
  }

  return result;
}
