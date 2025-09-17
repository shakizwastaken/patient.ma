import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { patient, patientOrganization, member } from "@acme/shared/server";

import {
  createTRPCRouter,
  protectedProcedure,
  organizationProcedure,
} from "@/server/api/trpc";

// Input validation schemas
const createPatientSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name too long"),
  phoneNumber: z.string().max(20, "Phone number too long").optional(),
  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .optional()
    .or(z.literal("")),
  age: z
    .number()
    .int()
    .min(0, "Age must be positive")
    .max(150, "Age must be realistic")
    .optional(),
  birthDate: z.coerce.date().optional(),
});

const updatePatientSchema = z.object({
  id: z.string().uuid("Invalid patient ID"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name too long")
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name too long")
    .optional(),
  phoneNumber: z.string().max(20, "Phone number too long").optional(),
  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .optional()
    .or(z.literal("")),
  age: z
    .number()
    .int()
    .min(0, "Age must be positive")
    .max(150, "Age must be realistic")
    .optional(),
  birthDate: z.coerce.date().optional(),
});

// Helper function to calculate age from birth date
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

// Note: Organization and patient access helper functions removed
// Access control is now handled by organizationProcedure middleware

export const patientsRouter = createTRPCRouter({
  // Get all patients for the active organization
  getAll: organizationProcedure.query(async ({ ctx }) => {
    try {
      const patients = await ctx.db
        .select({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phoneNumber: patient.phoneNumber,
          email: patient.email,
          age: patient.age,
          birthDate: patient.birthDate,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
        })
        .from(patient)
        .innerJoin(
          patientOrganization,
          eq(patient.id, patientOrganization.patientId),
        )
        .where(eq(patientOrganization.organizationId, ctx.organization.id))
        .orderBy(patient.createdAt);

      return patients;
    } catch (error) {
      console.error("Error fetching patients:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch patients",
      });
    }
  }),

  // Get a single patient by ID (within active organization)
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid patient ID") }))
    .query(async ({ ctx, input }) => {
      try {
        const [result] = await ctx.db
          .select()
          .from(patient)
          .innerJoin(
            patientOrganization,
            eq(patient.id, patientOrganization.patientId),
          )
          .where(
            and(
              eq(patient.id, input.id),
              eq(patientOrganization.organizationId, ctx.organization.id),
            ),
          );

        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found in your organization",
          });
        }

        return result.patient;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error fetching patient:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch patient",
        });
      }
    }),

  // Create a new patient in the active organization
  create: organizationProcedure
    .input(createPatientSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Start a transaction to ensure data consistency
        const result = await ctx.db.transaction(async (tx) => {
          // Prepare patient data with age calculation
          const patientValues: any = {
            ...input,
            email: input.email || null,
          };

          // If birthDate is provided, calculate age automatically
          if (input.birthDate) {
            const birthDate = new Date(input.birthDate);
            patientValues.age = calculateAge(birthDate);
          }

          // Create the patient
          const [newPatient] = await tx
            .insert(patient)
            .values(patientValues)
            .returning();

          if (!newPatient) {
            throw new Error("Failed to create patient");
          }

          // Link patient to the active organization
          await tx.insert(patientOrganization).values({
            patientId: newPatient.id,
            organizationId: ctx.organization.id,
          });

          return newPatient;
        });

        return result;
      } catch (error) {
        console.error("Error creating patient:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create patient",
        });
      }
    }),

  // Update a patient (within active organization)
  update: organizationProcedure
    .input(updatePatientSchema)
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
        // First verify the patient belongs to the active organization
        const patientExists = await ctx.db
          .select({ id: patient.id })
          .from(patient)
          .innerJoin(
            patientOrganization,
            eq(patient.id, patientOrganization.patientId),
          )
          .where(
            and(
              eq(patient.id, id),
              eq(patientOrganization.organizationId, ctx.organization.id),
            ),
          );

        if (patientExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found in your organization",
          });
        }

        const updateFields: any = {
          ...cleanUpdateData,
          updatedAt: new Date(),
        };
        if ("email" in cleanUpdateData)
          updateFields.email = cleanUpdateData.email || null;

        // If birthDate is being updated, recalculate age
        if ("birthDate" in cleanUpdateData && cleanUpdateData.birthDate) {
          const birthDate = new Date(cleanUpdateData.birthDate);
          updateFields.age = calculateAge(birthDate);
        }

        const [updatedPatient] = await ctx.db
          .update(patient)
          .set(updateFields)
          .where(eq(patient.id, id))
          .returning();

        return updatedPatient;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error updating patient:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update patient",
        });
      }
    }),

  // Delete a patient (within active organization)
  delete: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid patient ID") }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First verify the patient belongs to the active organization
        const patientExists = await ctx.db
          .select({ id: patient.id })
          .from(patient)
          .innerJoin(
            patientOrganization,
            eq(patient.id, patientOrganization.patientId),
          )
          .where(
            and(
              eq(patient.id, input.id),
              eq(patientOrganization.organizationId, ctx.organization.id),
            ),
          );

        if (patientExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found in your organization",
          });
        }

        // Delete patient (cascade will handle patientOrganization entries)
        const [deletedPatient] = await ctx.db
          .delete(patient)
          .where(eq(patient.id, input.id))
          .returning();

        return { success: true, deletedPatient };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error deleting patient:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete patient",
        });
      }
    }),

  // Note: Multi-organization patient management routes removed for simplicity
  // Patients are now scoped to the active organization only
});
