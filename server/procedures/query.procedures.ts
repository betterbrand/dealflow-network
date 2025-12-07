import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { contacts } from "../../drizzle/schema";
import { and, or, like, sql } from "drizzle-orm";
import { parseQuery } from "../services/query.service";

export const queryRouter = router({
  /**
   * Parse and execute natural language query
   */
  aiQuery: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
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

      return {
        parsed,
        explanation,
        results,
        count: results.length,
      };
    }),

  /**
   * Find introduction path between two contacts
   */
  findIntroductionPath: protectedProcedure
    .input(
      z.object({
        fromContactId: z.number().optional(),
        toContactId: z.number(),
        maxDepth: z.number().default(3),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // TODO: Implement BFS/DFS to find shortest path through relationships
      // For now, return empty path
      return {
        path: [],
        found: false,
      };
    }),
});
