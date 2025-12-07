import { invokeLLM } from "./server/_core/llm.ts";

async function test() {
  try {
    console.log("Testing LLM API call with JSON schema...");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a helpful assistant designed to output JSON." },
        { role: "user", content: "Extract the name from: My name is Alice" },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "person_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
    });
    
    console.log("Full response:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

test();
