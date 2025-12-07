import { parseQuery } from "./server/services/query.service.ts";

async function test() {
  try {
    console.log("Testing parseQuery...");
    const result = await parseQuery("Who do I know at Microsoft?");
    console.log("Success! Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stack) console.error("Stack:", error.stack);
  }
}

test();
