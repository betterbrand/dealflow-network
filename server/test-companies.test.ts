import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createCompany,
  getCompanyById,
  getAllCompanies,
  getCompaniesWithStats,
  getCompanyWithContacts,
  updateCompany,
  deleteCompany,
  getDb
} from './db';

// Skip if no database URL
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('Companies Feature', () => {
  let testCompanyId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;
    // Create a test company
    testCompanyId = await createCompany({
      name: 'Test Company',
      type: 'Startup',
      description: 'A test company for vitest',
      industry: 'Technology',
      location: 'San Francisco, CA',
      website: 'https://testcompany.com',
      size: '11-50',
      foundedYear: 2020,
      fundingStage: 'Series A',
    });
  });

  afterAll(async () => {
    // Clean up test company
    try {
      await deleteCompany(testCompanyId);
    } catch (error) {
      // Company might already be deleted by tests
    }
  });

  it('should create a new company', () => {
    expect(testCompanyId).toBeDefined();
    expect(typeof testCompanyId).toBe('number');
    expect(testCompanyId).toBeGreaterThan(0);
  });

  it('should retrieve a single company by ID', async () => {
    const company = await getCompanyById(testCompanyId);
    
    expect(company).toBeDefined();
    expect(company?.name).toBe('Test Company');
    expect(company?.industry).toBe('Technology');
    expect(company?.size).toBe('11-50');
    expect(company?.foundedYear).toBe(2020);
    expect(company?.type).toBe('Startup');
    expect(company?.fundingStage).toBe('Series A');
  });

  it('should retrieve all companies', async () => {
    const companies = await getAllCompanies();
    
    expect(Array.isArray(companies)).toBe(true);
    expect(companies.length).toBeGreaterThan(0);
    
    const testCompany = companies.find(c => c.id === testCompanyId);
    expect(testCompany).toBeDefined();
    expect(testCompany?.name).toBe('Test Company');
  });

  it('should retrieve companies with stats', async () => {
    const companies = await getCompaniesWithStats();
    
    expect(Array.isArray(companies)).toBe(true);
    
    const testCompany = companies.find(c => c.id === testCompanyId);
    expect(testCompany).toBeDefined();
    expect(testCompany).toHaveProperty('contactCount');
    expect(typeof testCompany?.contactCount).toBe('number');
    expect(testCompany?.contactCount).toBe(0); // No contacts added yet
  });

  it('should retrieve company with contacts', async () => {
    const company = await getCompanyWithContacts(testCompanyId);
    
    expect(company).toBeDefined();
    expect(company).toHaveProperty('contacts');
    expect(company).toHaveProperty('contactCount');
    expect(Array.isArray(company?.contacts)).toBe(true);
    expect(company?.contactCount).toBe(0); // No contacts added yet
  });

  it('should update a company', async () => {
    await updateCompany(testCompanyId, {
      description: 'Updated description for test company',
      employeeCount: 45,
      totalFunding: '$5M',
    });

    const updated = await getCompanyById(testCompanyId);
    expect(updated?.description).toBe('Updated description for test company');
    expect(updated?.employeeCount).toBe(45);
    expect(updated?.totalFunding).toBe('$5M');
  });

  it('should delete a company', async () => {
    await deleteCompany(testCompanyId);

    const deleted = await getCompanyById(testCompanyId);
    expect(deleted).toBeNull();
  });
});
