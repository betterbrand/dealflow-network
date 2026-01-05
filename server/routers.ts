import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { agentRouter } from "./routers/agent";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Get full user profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const { getUserProfile } = await import("./db");
      return await getUserProfile(ctx.user.id);
    }),

    // Update user profile
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        telegramUsername: z.string().optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        location: z.string().optional(),
        linkedinUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        bio: z.string().optional(),
        profilePictureUrl: z.string().optional(),
        bannerImageUrl: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateUserProfile } = await import("./db");
        return await updateUserProfile(ctx.user.id, input);
      }),

    // Import profile from LinkedIn URL
    importLinkedInProfile: protectedProcedure
      .input(z.object({ linkedinUrl: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        const { importUserLinkedInProfile } = await import("./db");
        return await importUserLinkedInProfile(ctx.user.id, input.linkedinUrl);
      }),

    // TEMPORARY: Email-gate login (no verification)
    // This bypasses magic link authentication as a workaround for publishing issues
    // Will be removed once proper magic link publishing is fixed
    emailGateLogin: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { upsertUser } = await import("./db");
        const { generateSessionToken } = await import("./_core/magic-link");

        // Create/update user with just email (no OAuth)
        await upsertUser({
          openId: `email-gate-${input.email}`, // Temporary openId format
          email: input.email,
          name: input.email.split('@')[0], // Use email prefix as name
          loginMethod: "email-gate",
          lastSignedIn: new Date(),
        });

        // Create session token
        const token = generateSessionToken(input.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true };
      }),
  }),

  contacts: router({
    list: protectedProcedure.query(async () => {
      const { getAllContacts } = await import("./db");
      return await getAllContacts();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getUserContact } = await import("./db-collaborative");
        return await getUserContact(ctx.user.id, input.id);
      }),

    getMetadata: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getContactMetadata } = await import("./db-collaborative");
        const { getContactAccessStatus } = await import("./access-control");

        const metadata = await getContactMetadata(input.id);
        if (!metadata) return null;

        const accessStatus = await getContactAccessStatus(ctx.user.id, input.id);

        return {
          ...metadata,
          accessStatus,
        };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        const { searchContacts } = await import("./db");
        return await searchContacts(input.query);
      }),
    
    aiQuery: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        console.log('[aiQuery] Received query:', input.query);
        
        try {
          const { parseQuery, generateFollowUpQuestions } = await import("./services/query.service");
          const { getDb } = await import("./db");
          const { contacts } = await import("../drizzle/schema");
          const { and, or, like } = await import("drizzle-orm");
          const { saveQueryHistory } = await import("./db-query-history");
          
          const db = await getDb();
          if (!db) throw new Error("Database not available");

        // Parse the natural language query
        const { parsed, explanation } = await parseQuery(input.query);

        // Build SQL filters based on parsed query
        const conditions: any[] = [];

        if (parsed.filters.companies && parsed.filters.companies.length > 0) {
          conditions.push(
            or(
              ...parsed.filters.companies.map((company) =>
                like(contacts.company, `%${company}%`)
              )
            )
          );
        }

        if (parsed.filters.roles && parsed.filters.roles.length > 0) {
          conditions.push(
            or(
              ...parsed.filters.roles.map((role) =>
                like(contacts.role, `%${role}%`)
              )
            )
          );
        }

        if (parsed.filters.locations && parsed.filters.locations.length > 0) {
          conditions.push(
            or(
              ...parsed.filters.locations.map((location) =>
                like(contacts.location, `%${location}%`)
              )
            )
          );
        }

        if (parsed.filters.names && parsed.filters.names.length > 0) {
          conditions.push(
            or(
              ...parsed.filters.names.map((name) =>
                like(contacts.name, `%${name}%`)
              )
            )
          );
        }

        // Execute query
        const results = await db
          .select()
          .from(contacts)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(50);

          // Save to query history
          await saveQueryHistory({
            userId: ctx.user.id,
            query: input.query,
            intent: parsed.intent,
            resultCount: results.length,
          });

          // Generate follow-up questions
          const followUpQuestions = await generateFollowUpQuestions(
            input.query,
            parsed,
            results.length
          );

          return {
            parsed,
            explanation,
            results,
            count: results.length,
            followUpQuestions,
          };
        } catch (error) {
          console.error('[aiQuery] Error:', error);
          throw error;
        }
      }),
    
    enrichFromLinkedIn: protectedProcedure
      .input(z.object({ linkedinUrl: z.string() }))
      .mutation(async ({ input }) => {
        const { enrichLinkedInProfile } = await import("./enrichment-adapter");
        const { getOrCreateCompanyForContact } = await import("./db-company-auto-create");

        console.log('[enrichFromLinkedIn] Starting enrichment for:', input.linkedinUrl);
        const enriched = await enrichLinkedInProfile(input.linkedinUrl);
        console.log('[enrichFromLinkedIn] Enrichment complete, RDF store updated');

        // Auto-create company if one exists in the enriched data
        try {
          const companyId = await getOrCreateCompanyForContact({
            company: enriched.experience?.[0]?.company, // Current/most recent company
            experience: enriched.experience,
          });

          if (companyId) {
            console.log('[enrichFromLinkedIn] Auto-created/linked company:', companyId);
            // Return enriched data with companyId for client to use when saving contact
            return { ...enriched, companyId };
          }
        } catch (error) {
          console.error('[enrichFromLinkedIn] Failed to auto-create company:', error);
          // Continue without company - don't fail the whole enrichment
        }

        return enriched;
      }),

    extractFromScreenshot: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        imageFormat: z.enum(['png', 'jpg', 'jpeg']),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromImage } = await import('./_core/ocr');
        const { extractContactsFromScreenshot } = await import('./morpheus');

        console.log('[extractFromScreenshot] Starting OCR extraction...');

        // Extract text from image using OCR
        const ocrText = await extractTextFromImage(input.imageBase64);
        console.log(`[extractFromScreenshot] OCR complete: ${ocrText.length} characters extracted`);

        // Extract contacts from OCR text using AI
        const contacts = await extractContactsFromScreenshot(ocrText);
        console.log(`[extractFromScreenshot] Extracted ${contacts.length} contact(s)`);

        return { ocrText, contacts };
      }),

    enrichMultipleUrls: protectedProcedure
      .input(z.object({
        urls: z.array(z.string().url()),
        platform: z.enum(['linkedin', 'twitter']),
      }))
      .mutation(async ({ input }) => {
        const { enrichLinkedInProfile, enrichTwitterProfile } = await import('./enrichment-adapter');

        console.log(`[enrichMultipleUrls] Starting enrichment for ${input.urls.length} ${input.platform} URLs...`);

        const results = [];
        const errors = [];

        // Process URLs with concurrency limit (3 at a time to avoid rate limits)
        const concurrencyLimit = 3;
        for (let i = 0; i < input.urls.length; i += concurrencyLimit) {
          const batch = input.urls.slice(i, i + concurrencyLimit);

          const batchPromises = batch.map(async (url) => {
            try {
              const enriched = input.platform === 'linkedin'
                ? await enrichLinkedInProfile(url)
                : await enrichTwitterProfile(url);

              return { url, success: true, data: enriched };
            } catch (error) {
              console.error(`[enrichMultipleUrls] Failed to enrich ${url}:`, error);
              return {
                url,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(r => r.success));
          errors.push(...batchResults.filter(r => !r.success));
        }

        console.log(`[enrichMultipleUrls] Enrichment complete: ${results.length} successful, ${errors.length} failed`);

        return { results, errors };
      }),

    parseCsv: protectedProcedure
      .input(z.object({
        csvText: z.string(),
        customMapping: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { parseCsvToContacts } = await import('./_core/csv-parser');

        console.log('[parseCsv] Starting CSV parsing...');

        const result = await parseCsvToContacts(input.csvText, input.customMapping);

        console.log(`[parseCsv] Parsing complete: ${result.successfulRows}/${result.totalRows} rows successful`);

        return result;
      }),

    createBulk: protectedProcedure
      .input(z.object({
        contacts: z.array(z.object({
          name: z.string(),
          company: z.string().optional(),
          role: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          location: z.string().optional(),
          telegramUsername: z.string().optional(),
          linkedinUrl: z.string().optional(),
          twitterUrl: z.string().optional(),
          notes: z.string().optional(),
          conversationSummary: z.string().optional(),
          sentiment: z.string().optional(),
          interestLevel: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createOrLinkContact } = await import('./db-collaborative');
        const { getOrCreateCompanyForContact } = await import('./db-company-auto-create');

        console.log(`[createBulk] Creating ${input.contacts.length} contacts...`);

        const results = [];

        for (const contactData of input.contacts) {
          try {
            // Auto-create company if company name exists
            let companyId: number | null | undefined;
            if (contactData.company) {
              try {
                companyId = await getOrCreateCompanyForContact({
                  company: contactData.company,
                });
              } catch (error) {
                console.error('[createBulk] Failed to auto-create company:', error);
              }
            }

            const { contactId, isNew, matchedBy } = await createOrLinkContact(
              ctx.user.id,
              { ...contactData, companyId },
              {
                privateNotes: contactData.notes,
                conversationSummary: contactData.conversationSummary,
                sentiment: contactData.sentiment as any,
                interestLevel: contactData.interestLevel as any,
              }
            );

            results.push({
              success: true,
              contactId,
              isNew,
              matchedBy,
              name: contactData.name,
            });
          } catch (error) {
            console.error(`[createBulk] Failed to create contact ${contactData.name}:`, error);
            results.push({
              success: false,
              name: contactData.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        const successful = results.filter(r => r.success).length;
        console.log(`[createBulk] Bulk creation complete: ${successful}/${input.contacts.length} successful`);

        return { results, total: input.contacts.length, successful };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        company: z.string().optional(),
        role: z.string().optional(),
        location: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        telegramUsername: z.string().optional(),
        linkedinUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        notes: z.string().optional(),
        conversationSummary: z.string().optional(),
        actionItems: z.string().optional(),
        sentiment: z.string().optional(),
        interestLevel: z.string().optional(),
        eventId: z.number().optional(),
        companyId: z.number().optional(),
        isPrivate: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createOrLinkContact } = await import("./db-collaborative");
        const { getDb } = await import("./db");
        const { socialProfiles } = await import("../drizzle/schema");
        const { enrichContactBackground } = await import("./enrichment");
        const { getOrCreateCompanyForContact } = await import("./db-company-auto-create");

        // Separate shared contact data from user-specific data
        const { notes, conversationSummary, actionItems, sentiment, interestLevel, eventId, isPrivate, ...contactData } = input;

        // Auto-create company if not explicitly provided but company name exists
        if (!contactData.companyId && contactData.company) {
          try {
            const autoCompanyId = await getOrCreateCompanyForContact({
              company: contactData.company,
            });
            if (autoCompanyId) {
              console.log('[contacts.create] Auto-created/linked company:', autoCompanyId);
              contactData.companyId = autoCompanyId;
            }
          } catch (error) {
            console.error('[contacts.create] Failed to auto-create company:', error);
            // Continue without company - don't fail the whole contact creation
          }
        }
        
        const { contactId, isNew, matchedBy } = await createOrLinkContact(
          ctx.user.id,
          contactData,
          {
            privateNotes: notes,
            conversationSummary,
            actionItems,
            sentiment,
            interestLevel,
            eventId,
          },
          isPrivate ?? false
        );
        
        // Store social profiles and trigger enrichment
        const db = await getDb();
        if (db && (input.linkedinUrl || input.twitterUrl)) {
          const profiles = [];
          if (input.linkedinUrl) {
            profiles.push({
              contactId,
              platform: "linkedin" as const,
              url: input.linkedinUrl,
            });
          }
          if (input.twitterUrl) {
            profiles.push({
              contactId,
              platform: "twitter" as const,
              url: input.twitterUrl,
            });
          }
          await db.insert(socialProfiles).values(profiles);
          
          // Start background enrichment
          enrichContactBackground(contactId, profiles).catch(err => {
            console.error("Background enrichment failed:", err);
          });
        }
        
        return { id: contactId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        company: z.string().optional(),
        role: z.string().optional(),
        location: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        telegramUsername: z.string().optional(),
        linkedinUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        notes: z.string().optional(),
        conversationSummary: z.string().optional(),
        actionItems: z.string().optional(),
        sentiment: z.string().optional(),
        interestLevel: z.string().optional(),
        eventId: z.number().optional(),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateContact, getContactById } = await import("./db");
        const { getDb } = await import("./db");
        const { socialProfiles } = await import("../drizzle/schema");
        const { enrichContactBackground } = await import("./enrichment");
        const { getOrCreateCompanyForContact } = await import("./db-company-auto-create");
        const { eq, and } = await import("drizzle-orm");

        const { id, linkedinUrl, twitterUrl, ...data } = input;

        // Auto-create company if company name is being updated and no explicit companyId provided
        if (!data.companyId && data.company) {
          try {
            const autoCompanyId = await getOrCreateCompanyForContact({
              company: data.company,
            });
            if (autoCompanyId) {
              console.log('[contacts.update] Auto-created/linked company:', autoCompanyId);
              data.companyId = autoCompanyId;
            }
          } catch (error) {
            console.error('[contacts.update] Failed to auto-create company:', error);
            // Continue without company - don't fail the whole update
          }
        }
        
        // Get existing contact to check if LinkedIn URL changed
        const existingContact = await getContactById(id);
        const linkedinUrlChanged = linkedinUrl && linkedinUrl !== existingContact?.linkedinUrl;
        const twitterUrlChanged = twitterUrl && twitterUrl !== existingContact?.twitterUrl;
        
        // Update contact
        await updateContact(id, { ...data, linkedinUrl, twitterUrl });
        
        // Update social profiles and trigger enrichment if URLs changed
        const db = await getDb();
        if (db && (linkedinUrlChanged || twitterUrlChanged)) {
          const profiles = [];
          
          if (linkedinUrlChanged && linkedinUrl) {
            // Delete old LinkedIn profile if exists
            await db.delete(socialProfiles)
              .where(and(
                eq(socialProfiles.contactId, id),
                eq(socialProfiles.platform, "linkedin")
              ));
            
            profiles.push({
              contactId: id,
              platform: "linkedin" as const,
              url: linkedinUrl,
            });
          }
          
          if (twitterUrlChanged && twitterUrl) {
            // Delete old Twitter profile if exists
            await db.delete(socialProfiles)
              .where(and(
                eq(socialProfiles.contactId, id),
                eq(socialProfiles.platform, "twitter")
              ));
            
            profiles.push({
              contactId: id,
              platform: "twitter" as const,
              url: twitterUrl,
            });
          }
          
          if (profiles.length > 0) {
            await db.insert(socialProfiles).values(profiles);
            
            // Start background enrichment
            enrichContactBackground(id, profiles).catch(err => {
              console.error("Background enrichment failed:", err);
            });
          }
        }

        return { success: true };
      }),

    // Stub endpoints for import provider system (exists on main, not on this branch)
    getAvailableProviders: protectedProcedure.query(async (): Promise<Array<{
      id: string;
      name: string;
      speed: 'fast' | 'slow';
    }>> => {
      // Return empty list - this feature exists on main
      return [];
    }),

    getImportPreview: protectedProcedure
      .input(z.object({
        provider: z.string(),
        credentialId: z.number().optional(),
        linkedinUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Stub - return empty preview
        return {
          contacts: [],
          provider: input.provider,
        };
      }),

    confirmImport: protectedProcedure
      .input(z.object({
        provider: z.string(),
        contacts: z.array(z.any()).optional(),
        contactId: z.number().optional(),
        importData: z.any().optional(),
        importCompany: z.boolean().optional(),
        linkedinUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Stub - return success with no imports
        return {
          success: true,
          importedCount: 0,
        };
      }),

    getUserCentricGraph: protectedProcedure
      .input(
        z.object({
          maxDepth: z.number().min(1).max(4).default(3),
          maxNodesPerDegree: z.number().min(5).max(50).default(20),
        }).optional()
      )
      .query(async ({ ctx, input }): Promise<{
        nodes: Array<{
          id: number;
          name: string;
          company?: string;
          role?: string;
          degree: number;
          isUser?: boolean;
          followers?: number;
          connections?: number;
          profilePictureUrl?: string;
        }>;
        edges: Array<{
          from: number;
          to: number;
          source: number;
          target: number;
          relationshipType?: string;
          edgeType?: string;
          strength?: number;
        }>;
        stats: {
          totalNodes: number;
          totalEdges: number;
          maxDepth: number;
          edgesByType: Record<string, number>;
        };
      }> => {
        const { getAllContacts } = await import("./db");
        const { contactRelationships, inferredEdges } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const { inArray, or } = await import("drizzle-orm");

        // Get all contacts for the user
        const allContactsData = await getAllContacts(ctx.user.id);
        const contacts = allContactsData.map(c => c.contact);

        // Create user node
        const userNode = {
          id: ctx.user.id,
          name: ctx.user.name || ctx.user.email?.split('@')[0] || 'User',
          degree: 0,
          isUser: true,
          followers: 0,
          connections: contacts.length,
        };

        // Create contact nodes (degree 1 - direct contacts)
        const contactNodes = contacts.map(c => ({
          id: c.id,
          name: c.name,
          company: c.company || undefined,
          role: c.role || undefined,
          degree: 1,
          isUser: false,
          followers: 0,
          connections: 0,
          profilePictureUrl: c.profilePictureUrl || undefined,
        }));

        const allNodes = [userNode, ...contactNodes];

        // Get relationships between user's contacts
        const db = await getDb();
        const contactIds = contacts.map(c => c.id);
        const relationships = db ? await db
          .select()
          .from(contactRelationships)
          .where(
            or(
              inArray(contactRelationships.fromContactId, contactIds),
              inArray(contactRelationships.toContactId, contactIds)
            )
          ) : [];

        // Filter to only relationships between contacts the user has access to
        const userContactIds = new Set(contactIds);
        const filteredRelationships = relationships.filter((rel: any) =>
          userContactIds.has(rel.fromContactId) && userContactIds.has(rel.toContactId)
        );

        // Create edges
        const edges: Array<{
          from: number;
          to: number;
          source: number;
          target: number;
          relationshipType?: string;
          edgeType?: string;
          strength?: number;
        }> = [];

        // Add edges from user to all direct contacts
        contactIds.forEach(contactId => {
          edges.push({
            from: ctx.user.id,
            to: contactId,
            source: ctx.user.id,
            target: contactId,
            edgeType: 'direct_contact',
            relationshipType: 'direct_contact',
            strength: 1,
          });
        });

        // Add edges between contacts
        filteredRelationships.forEach((rel: any) => {
          edges.push({
            from: rel.fromContactId,
            to: rel.toContactId,
            source: rel.fromContactId,
            target: rel.toContactId,
            edgeType: 'relationship',
            relationshipType: rel.relationshipType,
            strength: rel.strength || 1,
          });
        });

        // Calculate edge type stats
        const edgesByType: Record<string, number> = {};
        edges.forEach(edge => {
          const type = edge.edgeType || 'unknown';
          edgesByType[type] = (edgesByType[type] || 0) + 1;
        });

        return {
          nodes: allNodes,
          edges,
          stats: {
            totalNodes: allNodes.length,
            totalEdges: edges.length,
            maxDepth: 1, // Currently only showing direct contacts
            edgesByType,
          },
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteContact } = await import("./db");
        await deleteContact(input.id);
        return { success: true };
      }),
    
    getSuggestions: protectedProcedure.query(async ({ ctx }) => {
      const { getAllContacts } = await import("./db");
      const { contactRelationships } = await import("../drizzle/schema");
      const { getDb } = await import("./db");
      const { eq } = await import("drizzle-orm");

      // Get all contacts for the user
      const allContactsData = await getAllContacts(ctx.user.id);
      const contacts = allContactsData.map(c => c.contact);

      // Get existing relationships
      const db = await getDb();
      if (!db) return [];
      
      // Get all relationships involving the user's contacts
      const contactIds = contacts.map(c => c.id);
      const { inArray, or } = await import("drizzle-orm");
      
      const existingRelationships = await db
        .select()
        .from(contactRelationships)
        .where(
          or(
            inArray(contactRelationships.fromContactId, contactIds),
            inArray(contactRelationships.toContactId, contactIds)
          )
        );

      const existingPairs = new Set(
        existingRelationships.map((r: any) =>
          [r.fromContactId, r.toContactId].sort().join("-")
        )
      );

      // Find potential connections
      const suggestions: Array<{
        contact1: typeof contacts[0];
        contact2: typeof contacts[0];
        reason: string;
        confidence: "high" | "medium" | "low";
      }> = [];

      for (let i = 0; i < contacts.length; i++) {
        for (let j = i + 1; j < contacts.length; j++) {
          const c1 = contacts[i];
          const c2 = contacts[j];
          const pairKey = [c1.id, c2.id].sort().join("-");

          // Skip if relationship already exists
          if (existingPairs.has(pairKey)) continue;

          const reasons: string[] = [];
          let confidence: "high" | "medium" | "low" = "low";

          // Check shared company
          if (
            c1.company &&
            c2.company &&
            c1.company.toLowerCase() === c2.company.toLowerCase()
          ) {
            reasons.push(`both work at ${c1.company}`);
            confidence = "high";
          }

          // Check shared location
          if (
            c1.location &&
            c2.location &&
            c1.location.toLowerCase().includes(c2.location.toLowerCase())
          ) {
            reasons.push(`both in ${c1.location}`);
            if (confidence === "low") confidence = "medium";
          }

          // Check similar roles
          if (c1.role && c2.role) {
            const role1 = c1.role.toLowerCase();
            const role2 = c2.role.toLowerCase();
            const commonTerms = ["ceo", "cto", "cfo", "founder", "vp", "director"];
            const sharedRole = commonTerms.find(
              (term) => role1.includes(term) && role2.includes(term)
            );
            if (sharedRole) {
              reasons.push(`both are ${sharedRole}s`);
              if (confidence === "low") confidence = "medium";
            }
          }

          if (reasons.length > 0) {
            suggestions.push({
              contact1: c1,
              contact2: c2,
              reason: reasons.join(" and "),
              confidence,
            });
          }
        }
      }

      // Sort by confidence (high > medium > low) and limit to top 10
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return suggestions
        .sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence])
        .slice(0, 10);
    }),

    getGraph: protectedProcedure.query(async ({ ctx }) => {
      const { getAllContacts } = await import("./db");
      const { contactRelationships } = await import("../drizzle/schema");
      const { getDb } = await import("./db");

      // Get all contacts for the user
      const contacts = await getAllContacts(ctx.user.id);

      // Create a set of contact IDs the user has access to
      const userContactIds = new Set(contacts.map(c => c.contact.id));

      // Get all relationships
      const db = await getDb();
      const relationships = db ? await db.select().from(contactRelationships) : [];

      // Filter relationships to only include edges between contacts the user has access to
      const filteredRelationships = relationships.filter((rel: any) =>
        userContactIds.has(rel.fromContactId) && userContactIds.has(rel.toContactId)
      );

      // Transform to graph format
      const nodes = contacts.map(c => ({
        id: c.contact.id,
        name: c.contact.name,
        company: c.contact.company || undefined,
        role: c.contact.role || undefined,
      }));

      const links = filteredRelationships.map((rel: any) => ({
        source: rel.fromContactId,
        target: rel.toContactId,
        relationshipType: rel.relationshipType || undefined,
      }));

      return { nodes, links };
    }),
  }),

  // Semantic Graph and SPARQL endpoints
  semanticGraph: router({
    // Execute SPARQL query
    query: protectedProcedure
      .input(z.object({
        sparqlQuery: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { executeSparqlQuery } = await import("./_core/sparql");
        return await executeSparqlQuery(input.sparqlQuery);
      }),

    // Get graph statistics
    stats: protectedProcedure.query(async () => {
      const { getGraphStats } = await import("./_core/sparql");
      return getGraphStats();
    }),

    // Re-enrich contact and load semantic graph
    // Phase 1: Semantic graphs are loaded automatically during LinkedIn enrichment
    // This endpoint can trigger re-enrichment if needed
    reEnrichContact: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ input }) => {
        const { getContactById } = await import("./db");
        const { enrichLinkedInProfile } = await import("./enrichment-adapter");

        const contact = await getContactById(input.contactId);
        if (!contact) {
          throw new Error(`Contact ${input.contactId} not found`);
        }

        // If contact has LinkedIn URL, re-enrich it
        if (contact.linkedinUrl) {
          await enrichLinkedInProfile(contact.linkedinUrl, {
            userId: input.contactId,
          });
          return { success: true, message: "Contact re-enriched and semantic graph loaded" };
        }

        return { success: false, message: "Contact does not have LinkedIn URL for enrichment" };
      }),

    // Get all entities from RDF store
    getAllEntities: protectedProcedure.query(async () => {
      const { executeSparqlQuery } = await import("./_core/sparql");

      console.log('[getAllEntities] Querying RDF store...');
      // Simple query to get all entities
      const result = await executeSparqlQuery("SELECT * WHERE { ?s ?p ?o }");
      console.log('[getAllEntities] Query returned:', result.results?.length || 0, 'triples');
      return result;
    }),

    // Get triples for a specific contact (from DB)
    getContactTriples: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input }) => {
        // This is a stub - the triple-store module exists on main but not on this branch
        // Return empty result for now
        return {
          tripleCount: 0,
          triples: [],
          grouped: {},
        };
      }),

    // Predefined query: Find all people
    getAllPeople: protectedProcedure.query(async () => {
      const { QueryTemplates, executeSparqlQuery } = await import("./_core/sparql");
      return await executeSparqlQuery(QueryTemplates.getAllPeople());
    }),

    // Predefined query: Get connections for a person
    getConnections: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input }) => {
        const { QueryTemplates, executeSparqlQuery } = await import("./_core/sparql");
        return await executeSparqlQuery(QueryTemplates.getConnections(input.personId));
      }),

    // Predefined query: Get provenance for a contact
    getProvenance: protectedProcedure
      .input(z.object({ personId: z.string() }))
      .query(async ({ input }) => {
        const { QueryTemplates, executeSparqlQuery } = await import("./_core/sparql");
        return await executeSparqlQuery(QueryTemplates.getProvenance(input.personId));
      }),

    // Predefined query: Find people at a company
    getPeopleAtCompany: protectedProcedure
      .input(z.object({ companyName: z.string() }))
      .query(async ({ input }) => {
        const { QueryTemplates, executeSparqlQuery } = await import("./_core/sparql");
        return await executeSparqlQuery(QueryTemplates.getPeopleAtCompany(input.companyName));
      }),

    // Predefined query: Find people with a skill
    getPeopleWithSkill: protectedProcedure
      .input(z.object({ skill: z.string() }))
      .query(async ({ input }) => {
        const { QueryTemplates, executeSparqlQuery } = await import("./_core/sparql");
        return await executeSparqlQuery(QueryTemplates.getPeopleWithSkill(input.skill));
      }),

    // Clear the RDF store
    clear: protectedProcedure.mutation(async () => {
      const { clearGraph } = await import("./_core/sparql");
      clearGraph();
      return { success: true, message: "RDF store cleared" };
    }),
  }),

  companies: router({
    list: protectedProcedure.query(async () => {
      const { getAllCompanies } = await import("./db");
      return await getAllCompanies();
    }),
    
    listWithStats: protectedProcedure.query(async () => {
      const { getCompaniesWithStats } = await import("./db");
      return await getCompaniesWithStats();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getCompanyById } = await import("./db");
        return await getCompanyById(input.id);
      }),
    
    getWithContacts: protectedProcedure
      .input(z.object({ id: z.number() }))  
      .query(async ({ input }) => {
        const { getCompanyWithContacts } = await import("./db");
        return await getCompanyWithContacts(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        size: z.string().optional(),
        foundedYear: z.number().optional(),
        linkedinUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        employeeCount: z.number().optional(),
        fundingStage: z.string().optional(),
        totalFunding: z.string().optional(),
        tags: z.string().optional(), // JSON string
      }))
      .mutation(async ({ input }) => {
        const { createCompany } = await import("./db");
        const companyId = await createCompany(input);
        return { id: companyId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        size: z.string().optional(),
        foundedYear: z.number().optional(),
        linkedinUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        employeeCount: z.number().optional(),
        fundingStage: z.string().optional(),
        totalFunding: z.string().optional(),
        tags: z.string().optional(), // JSON string
      }))
      .mutation(async ({ input }) => {
        const { updateCompany } = await import("./db");
        const { id, ...data } = input;
        await updateCompany(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteCompany } = await import("./db");
        await deleteCompany(input.id);
        return { success: true };
      }),
  }),
  
  events: router({
    list: protectedProcedure.query(async () => {
      const { getAllEvents } = await import("./db");
      return await getAllEvents();
    }),
  }),
  
  graph: router({
    getData: protectedProcedure.query(async () => {
      const { getContactsForGraph } = await import("./db");
      return await getContactsForGraph();
    }),

    computeInferredEdges: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ input }) => {
        // Stub - inferred-edges service exists on main but not on this branch
        return { success: true, edgesCreated: 0 };
      }),
  }),
  
  relationships: router({
    create: protectedProcedure
      .input(z.object({
        fromContactId: z.number(),
        toContactId: z.number(),
        relationshipType: z.string(),
        strength: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createRelationship } = await import("./db");
        await createRelationship(input);
        return { success: true };
      }),
    
    getForContact: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input }) => {
        const { getRelationshipsForContact } = await import("./db");
        return await getRelationshipsForContact(input.contactId);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteRelationship } = await import("./db");
        await deleteRelationship(input.id);
        return { success: true };
      }),
  }),
  
  telegram: router({
    // Process /capture command - extract contact from conversation
    capture: protectedProcedure
      .input(z.object({
        conversationText: z.string(),
        chatId: z.number(),
        photos: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { extractContactFromConversation } = await import("./morpheus");
        const { sendMessage } = await import("./telegram");
        const { getDb } = await import("./db");
        const { contacts, socialProfiles } = await import("../drizzle/schema");
        
        // Extract contact data using Morpheus AI
        const extracted = await extractContactFromConversation(input.conversationText);
        
        // Create contact using collaborative model
        const { createOrLinkContact } = await import("./db-collaborative");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { contactId, isNew, matchedBy } = await createOrLinkContact(
          ctx.user.id,
          {
            name: extracted.name,
            company: extracted.company,
            role: extracted.role,
            email: extracted.email,
            phone: extracted.phone,
            location: extracted.location,
            telegramUsername: extracted.telegramUsername,
          },
          {
            conversationSummary: extracted.conversationSummary,
            actionItems: extracted.actionItems,
            sentiment: extracted.sentiment,
            interestLevel: extracted.interestLevel,
          }
        );
        
        // Store social profiles if found
        if (extracted.linkedinUrl || extracted.twitterUrl) {
          const profiles = [];
          if (extracted.linkedinUrl) {
            profiles.push({
              contactId,
              platform: "linkedin" as const,
              url: extracted.linkedinUrl,
            });
          }
          if (extracted.twitterUrl) {
            profiles.push({
              contactId,
              platform: "twitter" as const,
              url: extracted.twitterUrl,
            });
          }
          await db.insert(socialProfiles).values(profiles);
        }
        
        // Send confirmation message to user
        const confirmationText = `✅ Contact extracted:\n\n` +
          `**Name:** ${extracted.name}\n` +
          `**Company:** ${extracted.company || "N/A"}\n` +
          `**Role:** ${extracted.role || "N/A"}\n` +
          `**LinkedIn:** ${extracted.linkedinUrl || "N/A"}\n\n` +
          `Please confirm to save this contact.`;
        
        await sendMessage(input.chatId, confirmationText, {
          parse_mode: "Markdown",
        });
        
        return {
          success: true,
          contactId,
          extracted,
          isNew,
          matchedBy,
        };
      }),
    
    // Confirm and finalize contact save
    confirmSave: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        chatId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { sendMessage } = await import("./telegram");
        const { enrichContactBackground } = await import("./enrichment");
        const { getDb } = await import("./db");
        const { socialProfiles } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get social profiles for enrichment
        const profiles = await db
          .select()
          .from(socialProfiles)
          .where(eq(socialProfiles.contactId, input.contactId));
        
        // Start background enrichment
        if (profiles.length > 0) {
          enrichContactBackground(input.contactId, profiles).catch(err => {
            console.error("Background enrichment failed:", err);
          });
        }
        
        await sendMessage(input.chatId, "✅ Contact saved successfully! Enriching data in the background...");
        
        return { success: true };
      }),
  }),

  queryHistory: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getQueryHistory } = await import("./db-query-history");
      return await getQueryHistory(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { deleteQueryHistory } = await import("./db-query-history");
        return await deleteQueryHistory(input.id, ctx.user.id);
      }),

    clear: protectedProcedure.mutation(async ({ ctx }) => {
      const { clearQueryHistory } = await import("./db-query-history");
      return await clearQueryHistory(ctx.user.id);
    }),
  }),

  admin: router({
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      // Only allow admin users (first user in whitelist is considered admin)
      const { listAuthorizedUsers } = await import("./_core/admin-users");
      const users = await listAuthorizedUsers();
      if (!ctx.user.email || !users.includes(ctx.user.email)) {
        throw new Error("Unauthorized: Admin access required");
      }
      return users;
    }),

    addUser: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { listAuthorizedUsers, addAuthorizedUser } = await import("./_core/admin-users");
        const users = await listAuthorizedUsers();
        if (!ctx.user.email || !users.includes(ctx.user.email)) {
          throw new Error("Unauthorized: Admin access required");
        }
        return await addAuthorizedUser(input.email, ctx.user.id);
      }),

    removeUser: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { listAuthorizedUsers, removeAuthorizedUser } = await import("./_core/admin-users");
        const users = await listAuthorizedUsers();
        if (!ctx.user.email || !users.includes(ctx.user.email)) {
          throw new Error("Unauthorized: Admin access required");
        }
        // Prevent users from removing themselves
        if (ctx.user.email && input.email.toLowerCase() === ctx.user.email.toLowerCase()) {
          return { success: false, message: "Cannot remove yourself" };
        }
        return removeAuthorizedUser(input.email);
      }),
  }),

  notifications: router({
    // Get user notifications (optionally unread only)
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const { getUserNotifications } = await import("./db-notifications");
        return await getUserNotifications(ctx.user.id, input?.unreadOnly ?? false);
      }),

    // Mark notification as read
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { markNotificationAsRead } = await import("./db-notifications");
        await markNotificationAsRead(ctx.user.id, input.notificationId);
        return { success: true };
      }),

    // Mark all notifications as read
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { markAllNotificationsAsRead } = await import("./db-notifications");
        await markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),

    // Get unread notification count
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUnreadNotificationCount } = await import("./db-notifications");
        return await getUnreadNotificationCount(ctx.user.id);
      }),
  }),

  accessRequests: router({
    // Request access to a private contact
    request: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        message: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { requestContactAccess } = await import("./db-access-requests");
        return await requestContactAccess(ctx.user.id, input.contactId, input.message);
      }),

    // Approve access request
    approve: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { approveContactAccess } = await import("./db-access-requests");
        await approveContactAccess(input.requestId, ctx.user.id);
        return { success: true };
      }),

    // Deny access request
    deny: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { denyContactAccess } = await import("./db-access-requests");
        await denyContactAccess(input.requestId, ctx.user.id);
        return { success: true };
      }),

    // Get pending access requests (for contacts I own)
    getPending: protectedProcedure
      .query(async ({ ctx }) => {
        const { getPendingAccessRequests } = await import("./db-access-requests");
        return await getPendingAccessRequests(ctx.user.id);
      }),

    // Get access status for a contact
    getStatus: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input, ctx }) => {
        const { getContactAccessStatus } = await import("./access-control");
        return await getContactAccessStatus(ctx.user.id, input.contactId);
      }),
  }),

  agent: agentRouter,

  settings: router({
    // System settings (admin only)
    getSystemSettings: adminProcedure
      .input(z.object({ key: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const { getSystemSettings } = await import("./db-settings");
        return await getSystemSettings(input?.key);
      }),

    updateSystemSetting: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { updateSystemSetting } = await import("./db-settings");
        return await updateSystemSetting(input.key, input.value, ctx.user.id);
      }),

    // User settings
    getUserSettings: protectedProcedure
      .input(z.object({ key: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { getUserSettings } = await import("./db-settings");
        return await getUserSettings(ctx.user.id, input?.key);
      }),

    updateUserSetting: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { updateUserSetting } = await import("./db-settings");
        return await updateUserSetting(ctx.user.id, input.key, input.value);
      }),

    deleteUserSetting: protectedProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { deleteUserSetting } = await import("./db-settings");
        await deleteUserSetting(ctx.user.id, input.key);
        return { success: true };
      }),

    getEffectiveSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const { getEffectiveSettings } = await import("./db-settings");
        return await getEffectiveSettings(ctx.user.id);
      }),

    testLLMConnection: protectedProcedure
      .input(z.object({
        model: z.string(),
        apiUrl: z.string().optional(),
        apiKey: z.string().optional(),
        testFallback: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        try {
          const result = await invokeLLM(
            { messages: [{ role: "user", content: "Test" }] },
            {
              model: input.model,
              apiUrl: input.apiUrl,
              apiKey: input.apiKey,
              maxTokens: 10,
              enableFallback: input.testFallback || false,
            }
          );

          // Detect which provider was used based on model name
          let provider = "unknown";
          if (result.model.includes("claude")) {
            provider = "anthropic";
          } else if (input.apiUrl?.includes("mor.org")) {
            provider = "mor-org";
          } else if (input.apiUrl?.includes("anthropic")) {
            provider = "anthropic";
          } else {
            provider = "mor-org"; // Default assumption
          }

          return { success: true, model: result.model, provider };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    getAvailableModels: protectedProcedure
      .input(z.object({ provider: z.enum(["mor-org", "anthropic", "all"]).optional() }).optional())
      .query(async ({ input }) => {
        const { getCachedModels } = await import("./services/model-service");
        const provider = input?.provider === "all" ? undefined : input?.provider;
        return await getCachedModels(provider);
      }),

    refreshModels: adminProcedure
      .mutation(async () => {
        const { refreshModelCache } = await import("./services/model-service");
        await refreshModelCache();
        return { success: true, message: "Model cache refreshed" };
      }),
  }),
});

export type AppRouter = typeof appRouter;
