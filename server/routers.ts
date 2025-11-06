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
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        company: z.string().optional(),
        role: z.string().optional(),
        location: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        telegramUsername: z.string().optional(),
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
        const contactId = await createContact({
          ...input,
          addedBy: ctx.user.id,
        });
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
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateContact } = await import("./db");
        const { id, ...data } = input;
        await updateContact(id, data);
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
});

export type AppRouter = typeof appRouter;
