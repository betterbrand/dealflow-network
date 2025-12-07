import { invokeLLM } from "./server/_core/llm.ts";

async function test() {
  try {
    console.log("Testing LLM API call...");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello" },
      ],
    });
    
    console.log("Full response:", JSON.stringify(response, null, 2));
    console.log("\nResponse structure:");
    console.log("- Has choices:", !!response.choices);
    console.log("- Choices is array:", Array.isArray(response.choices));
    console.log("- Choices length:", response.choices?.length);
    if (response.choices && response.choices.length > 0) {
      console.log("- First choice:", JSON.stringify(response.choices[0], null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
