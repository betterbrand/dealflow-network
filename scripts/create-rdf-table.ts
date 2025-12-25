/**
 * Create rdfTriples table directly on Railway
 * Run with: npx tsx scripts/create-rdf-table.ts
 */

import "dotenv/config";
import mysql from "mysql2/promise";

async function createTable() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);

  console.log("Connected to database");

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS rdfTriples (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      subject VARCHAR(512) NOT NULL,
      predicate VARCHAR(512) NOT NULL,
      object TEXT NOT NULL,
      objectType VARCHAR(20) NOT NULL,
      contactId INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rdf_subject (subject),
      INDEX idx_rdf_predicate (predicate),
      INDEX idx_rdf_contact (contactId),
      FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE
    )
  `;

  try {
    await connection.execute(createTableSQL);
    console.log("Table rdfTriples created successfully!");

    // Verify the table exists
    const [rows] = await connection.execute("SHOW TABLES LIKE 'rdfTriples'");
    console.log("Verification:", rows);
  } catch (error: any) {
    if (error.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("Table already exists");
    } else {
      console.error("Error creating table:", error);
    }
  }

  await connection.end();
}

createTable().catch(console.error);
