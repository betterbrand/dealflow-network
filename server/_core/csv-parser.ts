/**
 * CSV Parser Service - Parse and validate CSV contact imports
 * Uses Papaparse for CSV parsing and Zod for validation
 */

import Papa from 'papaparse';
import { z } from 'zod';
import type { ExtractedContact } from '../morpheus';

/**
 * CSV column mapping - maps common CSV headers to our contact fields
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['name', 'full name', 'fullname', 'contact name', 'person'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  company: ['company', 'organization', 'org', 'employer', 'company name'],
  role: ['role', 'title', 'job title', 'position', 'job'],
  phone: ['phone', 'phone number', 'mobile', 'telephone', 'tel'],
  location: ['location', 'city', 'address', 'country', 'region'],
  linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile', 'li url', 'linkedin link'],
  twitterUrl: ['twitter', 'twitter url', 'x', 'x url', 'twitter profile', 'x profile'],
  telegramUsername: ['telegram', 'telegram username', 'telegram handle', 'tg'],
  notes: ['notes', 'note', 'comments', 'comment', 'description'],
};

/**
 * Zod schema for validating CSV row data
 */
const contactRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  role: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  telegramUsername: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export interface ParsedCsvResult {
  contacts: ExtractedContact[];
  errors: Array<{ row: number; field: string; message: string }>;
  totalRows: number;
  successfulRows: number;
  mapping: Record<string, string>;
}

/**
 * Auto-detect column mapping from CSV headers
 */
function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();

    // Find matching field
    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (aliases.includes(normalizedHeader)) {
        mapping[header] = field;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Map CSV row to contact object using column mapping
 */
function mapRowToContact(
  row: Record<string, string>,
  mapping: Record<string, string>
): Partial<ExtractedContact> {
  const contact: Partial<ExtractedContact> = {};

  for (const [csvColumn, fieldName] of Object.entries(mapping)) {
    const value = row[csvColumn]?.trim();
    if (value) {
      // @ts-ignore - dynamic field assignment
      contact[fieldName] = value;
    }
  }

  return contact;
}

/**
 * Parse CSV text and extract contacts
 *
 * @param csvText - Raw CSV text content
 * @param customMapping - Optional custom column mapping (overrides auto-detection)
 * @returns Parsed contacts with validation errors
 */
export async function parseCsvToContacts(
  csvText: string,
  customMapping?: Record<string, string>
): Promise<ParsedCsvResult> {
  console.log('[CSV Parser] Starting CSV parsing...');

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          const contacts: ExtractedContact[] = [];
          const errors: Array<{ row: number; field: string; message: string }> = [];

          // Auto-detect or use custom mapping
          const headers = results.meta.fields || [];
          const mapping = customMapping || detectColumnMapping(headers);

          console.log('[CSV Parser] Detected column mapping:', mapping);
          console.log(`[CSV Parser] Processing ${results.data.length} rows...`);

          // Validate and parse each row
          results.data.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // +2 because CSV is 1-indexed and has header row

            try {
              // Map CSV row to contact fields
              const mappedContact = mapRowToContact(row, mapping);

              // Validate with Zod schema
              const validated = contactRowSchema.parse(mappedContact);

              // Convert to ExtractedContact (only include non-empty fields)
              const contact: ExtractedContact = { name: validated.name };
              if (validated.email) contact.email = validated.email;
              if (validated.company) contact.company = validated.company;
              if (validated.role) contact.role = validated.role;
              if (validated.phone) contact.phone = validated.phone;
              if (validated.location) contact.location = validated.location;
              if (validated.linkedinUrl) contact.linkedinUrl = validated.linkedinUrl;
              if (validated.twitterUrl) contact.twitterUrl = validated.twitterUrl;
              if (validated.telegramUsername) contact.telegramUsername = validated.telegramUsername;
              if (validated.notes) contact.conversationSummary = validated.notes;

              contacts.push(contact);
            } catch (error) {
              if (error instanceof z.ZodError) {
                // Record validation errors
                error.issues.forEach((err) => {
                  errors.push({
                    row: rowNumber,
                    field: err.path.join('.'),
                    message: err.message,
                  });
                });
              } else {
                errors.push({
                  row: rowNumber,
                  field: 'unknown',
                  message: error instanceof Error ? error.message : 'Unknown parsing error',
                });
              }
            }
          });

          const result: ParsedCsvResult = {
            contacts,
            errors,
            totalRows: results.data.length,
            successfulRows: contacts.length,
            mapping,
          };

          console.log(
            `[CSV Parser] Parsing complete: ${result.successfulRows}/${result.totalRows} rows successful, ${errors.length} errors`
          );

          resolve(result);
        } catch (error) {
          console.error('[CSV Parser] Unexpected error during parsing:', error);
          reject(
            new Error(
              `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      },
      error: (error: any) => {
        console.error('[CSV Parser] Papaparse error:', error);
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Validate CSV format without full parsing
 * Useful for quick validation before uploading
 */
export function validateCsvFormat(csvText: string): { valid: boolean; error?: string } {
  if (!csvText || csvText.trim().length === 0) {
    return { valid: false, error: 'CSV file is empty' };
  }

  // Check for at least 2 lines (header + 1 data row)
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { valid: false, error: 'CSV must contain at least a header row and one data row' };
  }

  // Check for common CSV issues
  const firstLine = lines[0];
  if (!firstLine.includes(',') && !firstLine.includes('\t')) {
    return { valid: false, error: 'CSV must be comma or tab delimited' };
  }

  return { valid: true };
}

/**
 * Get available field mappings for UI column mapping
 */
export function getAvailableFields(): string[] {
  return Object.keys(COLUMN_MAPPINGS);
}

/**
 * Generate CSV template for download
 */
export function generateCsvTemplate(): string {
  const headers = [
    'Name',
    'Email',
    'Company',
    'Role',
    'Phone',
    'Location',
    'LinkedIn URL',
    'Twitter URL',
    'Telegram Username',
    'Notes',
  ];

  const exampleRow = [
    'John Doe',
    'john@example.com',
    'Acme Corp',
    'CEO',
    '+1 234 567 8900',
    'San Francisco, CA',
    'https://linkedin.com/in/johndoe',
    'https://twitter.com/johndoe',
    '@johndoe',
    'Met at TechConf 2026',
  ];

  return `${headers.join(',')}\n${exampleRow.join(',')}`;
}
