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
      .query(async ({ input }) => {
        const { getContactById } = await import("./db");
        return await getContactById(input.id);
      }),
    
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        const { searchContacts } = await import("./db");
        return await searchContacts(input.query);
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
        const { createContact } = await import("./db");
        const { getDb } = await import("./db");
        const { socialProfiles } = await import("../drizzle/schema");
        const { enrichContactBackground } = await import("./enrichment");
        
        const contactId = await createContact({
          ...input,
          addedBy: ctx.user.id,
        });
        
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
        
        // Create a temporary contact record for confirmation
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [contact] = await db.insert(contacts).values({
          name: extracted.name,
          company: extracted.company,
          role: extracted.role,
          email: extracted.email,
          phone: extracted.phone,
          location: extracted.location,
          telegramUsername: extracted.telegramUsername,
          conversationSummary: extracted.conversationSummary,
          actionItems: extracted.actionItems,
          sentiment: extracted.sentiment,
          interestLevel: extracted.interestLevel,
          addedBy: ctx.user.id,
        }).$returningId();
        
        // Store social profiles if found
        if (extracted.linkedinUrl || extracted.twitterUrl) {
          const profiles = [];
          if (extracted.linkedinUrl) {
            profiles.push({
              contactId: contact.id,
              platform: "linkedin" as const,
              url: extracted.linkedinUrl,
            });
          }
          if (extracted.twitterUrl) {
            profiles.push({
              contactId: contact.id,
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
          contactId: contact.id,
          extracted,
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
});

export type AppRouter = typeof appRouter;
