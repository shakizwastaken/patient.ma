import { z } from "zod";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { drug, organizationCustomDrug } from "@acme/shared/server";

import {
  createTRPCRouter,
  protectedProcedure,
  organizationProcedure,
} from "@/server/api/trpc";

// Input validation schemas
const searchDrugsSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Query too long"),
  limit: z.number().min(1).max(50).default(10),
  includeCustom: z.boolean().default(true),
});

const createCustomDrugSchema = z.object({
  brand: z
    .string()
    .min(1, "Brand name is required")
    .max(100, "Brand name too long"),
  dci: z.string().min(1, "DCI is required").max(200, "DCI too long"),
  substanceActive: z
    .string()
    .min(1, "Active substance is required")
    .max(200, "Active substance too long"),
  strength: z
    .string()
    .min(1, "Strength is required")
    .max(50, "Strength too long"),
  form: z.string().min(1, "Form is required").max(50, "Form too long"),
  route: z.string().min(1, "Route is required").max(50, "Route too long"),
  presentation: z
    .string()
    .min(1, "Presentation is required")
    .max(200, "Presentation too long"),
  description: z.string().max(500, "Description too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

const updateCustomDrugSchema = z.object({
  id: z.string().uuid("Invalid custom drug ID"),
  brand: z
    .string()
    .min(1, "Brand name is required")
    .max(100, "Brand name too long")
    .optional(),
  dci: z.string().min(1, "DCI is required").max(200, "DCI too long").optional(),
  substanceActive: z
    .string()
    .min(1, "Active substance is required")
    .max(200, "Active substance too long")
    .optional(),
  strength: z
    .string()
    .min(1, "Strength is required")
    .max(50, "Strength too long")
    .optional(),
  form: z
    .string()
    .min(1, "Form is required")
    .max(50, "Form too long")
    .optional(),
  route: z
    .string()
    .min(1, "Route is required")
    .max(50, "Route too long")
    .optional(),
  presentation: z
    .string()
    .min(1, "Presentation is required")
    .max(200, "Presentation too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  isActive: z.boolean().optional(),
});

export const drugsRouter = createTRPCRouter({
  // Search drugs in the system database
  search: organizationProcedure
    .input(searchDrugsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const searchTerm = input.query.toLowerCase().trim();
        const searchPattern = `%${searchTerm}%`;

        // Search in system drugs database
        const systemDrugs = await ctx.db
          .select({
            id: drug.id,
            brand: drug.brand,
            dci: drug.dci,
            substanceActive: drug.substanceActive,
            strength: drug.strength,
            form: drug.form,
            route: drug.route,
            presentation: drug.presentation,
            classeTherapeutique: drug.classeTherapeutique,
            isActive: drug.isActive,
            source: drug.source,
          })
          .from(drug)
          .where(
            and(
              eq(drug.isActive, true),
              or(
                ilike(drug.brand, searchPattern),
                ilike(drug.dci, searchPattern),
                ilike(drug.substanceActive, searchPattern),
                ilike(drug.haystack, searchPattern),
                sql`to_tsvector('french', ${drug.haystack}) @@ plainto_tsquery('french', ${searchTerm})`,
              ),
            ),
          )
          .orderBy(
            sql`CASE 
              WHEN ${drug.brand} ILIKE ${searchTerm} THEN 1
              WHEN ${drug.dci} ILIKE ${searchTerm} THEN 2
              ELSE 3
            END`,
            drug.brand,
          )
          .limit(input.limit);

        // Search in organization custom drugs if requested
        let customDrugs: any[] = [];
        if (input.includeCustom) {
          customDrugs = await ctx.db
            .select({
              id: organizationCustomDrug.id,
              brand: organizationCustomDrug.brand,
              dci: organizationCustomDrug.dci,
              substanceActive: organizationCustomDrug.substanceActive,
              strength: organizationCustomDrug.strength,
              form: organizationCustomDrug.form,
              route: organizationCustomDrug.route,
              presentation: organizationCustomDrug.presentation,
              description: organizationCustomDrug.description,
              notes: organizationCustomDrug.notes,
              isActive: organizationCustomDrug.isActive,
              source: sql`'custom'`,
              classeTherapeutique: sql`null`,
            })
            .from(organizationCustomDrug)
            .where(
              and(
                eq(organizationCustomDrug.organizationId, ctx.organization.id),
                eq(organizationCustomDrug.isActive, true),
                or(
                  ilike(organizationCustomDrug.brand, searchPattern),
                  ilike(organizationCustomDrug.dci, searchPattern),
                  ilike(organizationCustomDrug.substanceActive, searchPattern),
                  ilike(organizationCustomDrug.description, searchPattern),
                ),
              ),
            )
            .orderBy(organizationCustomDrug.brand)
            .limit(input.limit);
        }

        // Combine and sort results
        const allDrugs = [...systemDrugs, ...customDrugs];

        // Sort by relevance (exact matches first, then partial matches)
        allDrugs.sort((a, b) => {
          const aBrand = a.brand.toLowerCase();
          const bBrand = b.brand.toLowerCase();
          const aDci = a.dci.toLowerCase();
          const bDci = b.dci.toLowerCase();
          const searchLower = searchTerm;

          // Exact brand match gets highest priority
          if (aBrand === searchLower && bBrand !== searchLower) return -1;
          if (bBrand === searchLower && aBrand !== searchLower) return 1;

          // Brand starts with search term gets second priority
          if (aBrand.startsWith(searchLower) && !bBrand.startsWith(searchLower))
            return -1;
          if (bBrand.startsWith(searchLower) && !aBrand.startsWith(searchLower))
            return 1;

          // DCI match gets third priority
          if (aDci.includes(searchLower) && !bDci.includes(searchLower))
            return -1;
          if (bDci.includes(searchLower) && !aDci.includes(searchLower))
            return 1;

          // Alphabetical by brand
          return aBrand.localeCompare(bBrand);
        });

        return allDrugs.slice(0, input.limit);
      } catch (error) {
        console.error("Error searching drugs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search drugs",
        });
      }
    }),

  // Get popular drugs (most commonly prescribed)
  getPopular: organizationProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      try {
        // For now, return some common drugs from the database
        // In the future, this could be based on actual prescription statistics
        const popularDrugs = await ctx.db
          .select({
            id: drug.id,
            brand: drug.brand,
            dci: drug.dci,
            substanceActive: drug.substanceActive,
            strength: drug.strength,
            form: drug.form,
            route: drug.route,
            presentation: drug.presentation,
            classeTherapeutique: drug.classeTherapeutique,
            isActive: drug.isActive,
            source: drug.source,
          })
          .from(drug)
          .where(
            and(
              eq(drug.isActive, true),
              or(
                ilike(drug.classeTherapeutique, "%ANTALGIQUE%"),
                ilike(drug.classeTherapeutique, "%ANTIBIOTIQUE%"),
                ilike(drug.classeTherapeutique, "%ANTI-INFLAMMATOIRE%"),
                ilike(drug.classeTherapeutique, "%ANTIPYRETIQUE%"),
              ),
            ),
          )
          .orderBy(drug.brand)
          .limit(input.limit);

        return popularDrugs;
      } catch (error) {
        console.error("Error fetching popular drugs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch popular drugs",
        });
      }
    }),

  // Get drug details by ID
  getById: organizationProcedure
    .input(
      z.object({
        id: z.string().uuid("Invalid drug ID"),
        isCustom: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        if (input.isCustom) {
          // Get custom drug
          const [customDrug] = await ctx.db
            .select()
            .from(organizationCustomDrug)
            .where(
              and(
                eq(organizationCustomDrug.id, input.id),
                eq(organizationCustomDrug.organizationId, ctx.organization.id),
              ),
            );

          if (!customDrug) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Custom drug not found",
            });
          }

          return {
            ...customDrug,
            source: "custom",
            classeTherapeutique: null,
          };
        } else {
          // Get system drug
          const [systemDrug] = await ctx.db
            .select()
            .from(drug)
            .where(eq(drug.id, input.id));

          if (!systemDrug) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Drug not found",
            });
          }

          return systemDrug;
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error fetching drug details:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch drug details",
        });
      }
    }),

  // Custom drugs management
  // Get all custom drugs for the organization
  getCustomDrugs: organizationProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const offset = (input.page - 1) * input.limit;
        const conditions = [
          eq(organizationCustomDrug.organizationId, ctx.organization.id),
        ];

        if (input.search) {
          const searchPattern = `%${input.search}%`;
          conditions.push(
            or(
              ilike(organizationCustomDrug.brand, searchPattern),
              ilike(organizationCustomDrug.dci, searchPattern),
              ilike(organizationCustomDrug.substanceActive, searchPattern),
            ),
          );
        }

        if (input.isActive !== undefined) {
          conditions.push(eq(organizationCustomDrug.isActive, input.isActive));
        }

        const [customDrugs, totalCount] = await Promise.all([
          ctx.db
            .select()
            .from(organizationCustomDrug)
            .where(and(...conditions))
            .orderBy(desc(organizationCustomDrug.createdAt))
            .limit(input.limit)
            .offset(offset),
          ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(organizationCustomDrug)
            .where(and(...conditions))
            .then((result) => result[0]?.count || 0),
        ]);

        return {
          drugs: customDrugs,
          total: totalCount,
          totalPages: Math.ceil(totalCount / input.limit),
          currentPage: input.page,
        };
      } catch (error) {
        console.error("Error fetching custom drugs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch custom drugs",
        });
      }
    }),

  // Create a custom drug
  createCustom: organizationProcedure
    .input(createCustomDrugSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const [newCustomDrug] = await ctx.db
          .insert(organizationCustomDrug)
          .values({
            organizationId: ctx.organization.id,
            ...input,
          })
          .returning();

        return newCustomDrug;
      } catch (error) {
        console.error("Error creating custom drug:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create custom drug",
        });
      }
    }),

  // Update a custom drug
  updateCustom: organizationProcedure
    .input(updateCustomDrugSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Remove undefined values from update data
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined),
      );

      if (Object.keys(cleanUpdateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      try {
        // First verify the custom drug belongs to the organization
        const customDrugExists = await ctx.db
          .select({ id: organizationCustomDrug.id })
          .from(organizationCustomDrug)
          .where(
            and(
              eq(organizationCustomDrug.id, id),
              eq(organizationCustomDrug.organizationId, ctx.organization.id),
            ),
          );

        if (customDrugExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Custom drug not found in your organization",
          });
        }

        const [updatedCustomDrug] = await ctx.db
          .update(organizationCustomDrug)
          .set({
            ...cleanUpdateData,
            updatedAt: new Date(),
          })
          .where(eq(organizationCustomDrug.id, id))
          .returning();

        return updatedCustomDrug;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error updating custom drug:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update custom drug",
        });
      }
    }),

  // Delete a custom drug
  deleteCustom: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid custom drug ID") }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First verify the custom drug belongs to the organization
        const customDrugExists = await ctx.db
          .select({ id: organizationCustomDrug.id })
          .from(organizationCustomDrug)
          .where(
            and(
              eq(organizationCustomDrug.id, input.id),
              eq(organizationCustomDrug.organizationId, ctx.organization.id),
            ),
          );

        if (customDrugExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Custom drug not found in your organization",
          });
        }

        const [deletedCustomDrug] = await ctx.db
          .delete(organizationCustomDrug)
          .where(eq(organizationCustomDrug.id, input.id))
          .returning();

        return { success: true, deletedCustomDrug };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error deleting custom drug:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete custom drug",
        });
      }
    }),
});
