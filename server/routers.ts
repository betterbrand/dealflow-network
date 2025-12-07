import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

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
        const enriched = await enrichLinkedInProfile(input.linkedinUrl);
        return enriched;
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
      }))
      .mutation(async ({ input, ctx }) => {
        const { createOrLinkContact } = await import("./db-collaborative");
        const { getDb } = await import("./db");
        const { socialProfiles } = await import("../drizzle/schema");
        const { enrichContactBackground } = await import("./enrichment");
        
        // Separate shared contact data from user-specific data
        const { notes, conversationSummary, actionItems, sentiment, interestLevel, eventId, ...contactData } = input;
        
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
          }
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
        const { eq, and } = await import("drizzle-orm");
        
        const { id, linkedinUrl, twitterUrl, ...data } = input;
        
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
      
      // Get all relationships
      const db = await getDb();
      const relationships = db ? await db.select().from(contactRelationships) : [];
      
      // Transform to graph format
      const nodes = contacts.map(c => ({
        id: c.contact.id,
        name: c.contact.name,
        company: c.contact.company || undefined,
        role: c.contact.role || undefined,
      }));
      
      const links = relationships.map((rel: any) => ({
        source: rel.fromContactId,
        target: rel.toContactId,
        relationshipType: rel.relationshipType || undefined,
      }));
      
      return { nodes, links };
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
      const users = listAuthorizedUsers();
      if (!ctx.user.email || !users.includes(ctx.user.email)) {
        throw new Error("Unauthorized: Admin access required");
      }
      return users;
    }),

    addUser: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { listAuthorizedUsers, addAuthorizedUser } = await import("./_core/admin-users");
        const users = listAuthorizedUsers();
        if (!ctx.user.email || !users.includes(ctx.user.email)) {
          throw new Error("Unauthorized: Admin access required");
        }
        return addAuthorizedUser(input.email);
      }),

    removeUser: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { listAuthorizedUsers, removeAuthorizedUser } = await import("./_core/admin-users");
        const users = listAuthorizedUsers();
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
});

export type AppRouter = typeof appRouter;
