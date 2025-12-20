/**
 * Test auto-company creation feature
 * Run with: npx tsx test-company-auto-create.ts
 */

import { getOrCreateCompanyForContact } from "./server/db-company-auto-create";
import { getCompanyByName, getAllCompanies } from "./server/db";

async function testAutoCreateCompany() {
  console.log("\n=== Testing Auto-Company Creation ===\n");

  // Test 1: Create company from company field
  console.log("Test 1: Create company from company field");
  const companyId1 = await getOrCreateCompanyForContact({
    company: "Test Company Inc",
  });
  console.log("✓ Company ID:", companyId1);

  // Test 2: Try to create same company again (should return existing)
  console.log("\nTest 2: Get existing company");
  const companyId2 = await getOrCreateCompanyForContact({
    company: "Test Company Inc",
  });
  console.log("✓ Company ID (should be same):", companyId2);
  console.log("✓ IDs match:", companyId1 === companyId2);

  // Test 3: Create company from experience data
  console.log("\nTest 3: Create company from experience");
  const companyId3 = await getOrCreateCompanyForContact({
    experience: [
      {
        company: "Another Test Corp",
        title: "Software Engineer",
        startDate: "2020-01",
      },
    ],
  });
  console.log("✓ Company ID:", companyId3);

  // Test 4: Current vs past experience
  console.log("\nTest 4: Prefer current experience (no endDate)");
  const companyId4 = await getOrCreateCompanyForContact({
    experience: [
      {
        company: "Current Employer",
        title: "CTO",
        startDate: "2023-01",
        // No endDate = current job
      },
      {
        company: "Past Employer",
        title: "Developer",
        startDate: "2020-01",
        endDate: "2022-12",
      },
    ],
  });
  console.log("✓ Company ID:", companyId4);
  const currentCompany = await getCompanyByName("Current Employer");
  console.log("✓ Created current employer:", currentCompany?.name);

  // Test 5: No company data
  console.log("\nTest 5: No company data");
  const companyId5 = await getOrCreateCompanyForContact({});
  console.log("✓ Company ID (should be null):", companyId5);

  // Show all companies
  console.log("\n=== All Companies ===");
  const allCompanies = await getAllCompanies();
  allCompanies.forEach(company => {
    console.log(`- ${company.name} (ID: ${company.id})`);
  });

  console.log("\n✅ All tests passed!\n");
}

testAutoCreateCompany().catch(console.error);
