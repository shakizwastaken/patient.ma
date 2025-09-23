import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  prescription,
  prescriptionItem,
  drug,
  organizationCustomDrug,
  patient,
  patientOrganization,
  user,
} from "@acme/shared/server";

import {
  createTRPCRouter,
  protectedProcedure,
  organizationProcedure,
} from "@/server/api/trpc";

// Input validation schemas
const prescriptionItemSchema = z
  .object({
    drugId: z.string().uuid("Invalid drug ID").optional(),
    customDrugId: z.string().uuid("Invalid custom drug ID").optional(),
    drugName: z
      .string()
      .min(1, "Drug name is required")
      .max(200, "Drug name too long"),
    drugDci: z.string().min(1, "DCI is required").max(200, "DCI too long"),
    drugStrength: z
      .string()
      .min(1, "Strength is required")
      .max(50, "Strength too long"),
    drugForm: z.string().min(1, "Form is required").max(50, "Form too long"),
    drugPresentation: z
      .string()
      .min(1, "Presentation is required")
      .max(200, "Presentation too long"),
    dosage: z.string().min(1, "Dosage is required").max(100, "Dosage too long"),
    frequency: z
      .string()
      .min(1, "Frequency is required")
      .max(100, "Frequency too long"),
    duration: z
      .string()
      .min(1, "Duration is required")
      .max(100, "Duration too long"),
    quantity: z.string().max(100, "Quantity too long").optional(),
    instructions: z.string().max(500, "Instructions too long").optional(),
    order: z.number().int().min(0).default(0),
  })
  .refine((data) => data.drugId || data.customDrugId, {
    message: "Either drugId or customDrugId must be provided",
    path: ["drugId"],
  });

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  diagnosis: z.string().max(500, "Diagnosis too long").optional(),
  doctorName: z
    .string()
    .min(1, "Doctor name is required")
    .max(200, "Doctor name too long"),
  doctorSignature: z.string().optional(),
  doctorLicenseNumber: z.string().max(50, "License number too long").optional(),
  instructions: z.string().max(1000, "Instructions too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  appointmentId: z.string().uuid("Invalid appointment ID").optional(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one prescription item is required"),
});

const updatePrescriptionSchema = z.object({
  id: z.string().uuid("Invalid prescription ID"),
  diagnosis: z.string().max(500, "Diagnosis too long").optional(),
  doctorName: z
    .string()
    .min(1, "Doctor name is required")
    .max(200, "Doctor name too long")
    .optional(),
  doctorSignature: z.string().optional(),
  doctorLicenseNumber: z.string().max(50, "License number too long").optional(),
  instructions: z.string().max(1000, "Instructions too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  items: z.array(prescriptionItemSchema).optional(),
});

const getPrescriptionsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  patientId: z.string().uuid().optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// Helper function to generate prescription number
async function generatePrescriptionNumber(
  db: any,
  organizationId: string,
): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  // Get the count of prescriptions for this organization today
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(prescription)
    .where(
      and(
        eq(prescription.organizationId, organizationId),
        sql`DATE(${prescription.createdAt}) = CURRENT_DATE`,
      ),
    );

  const dailyCount = (result?.count || 0) + 1;
  const prescriptionNumber = `RX${year}${month}${day}${String(dailyCount).padStart(3, "0")}`;

  return prescriptionNumber;
}

export const prescriptionsRouter = createTRPCRouter({
  // Get all prescriptions for the organization
  getAll: organizationProcedure
    .input(getPrescriptionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const offset = (input.page - 1) * input.limit;
        const conditions = [
          eq(prescription.organizationId, ctx.organization.id),
        ];

        if (input.patientId) {
          conditions.push(eq(prescription.patientId, input.patientId));
        }

        if (input.status) {
          conditions.push(eq(prescription.status, input.status));
        }

        if (input.startDate) {
          conditions.push(sql`${prescription.date} >= ${input.startDate}`);
        }

        if (input.endDate) {
          conditions.push(sql`${prescription.date} <= ${input.endDate}`);
        }

        const [prescriptions, totalCount] = await Promise.all([
          ctx.db
            .select({
              id: prescription.id,
              prescriptionNumber: prescription.prescriptionNumber,
              date: prescription.date,
              diagnosis: prescription.diagnosis,
              doctorName: prescription.doctorName,
              instructions: prescription.instructions,
              notes: prescription.notes,
              status: prescription.status,
              createdAt: prescription.createdAt,
              patient: {
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.email,
                phoneNumber: patient.phoneNumber,
              },
              author: {
                id: user.id,
                name: user.name,
                email: user.email,
              },
            })
            .from(prescription)
            .innerJoin(patient, eq(prescription.patientId, patient.id))
            .innerJoin(user, eq(prescription.createdById, user.id))
            .where(and(...conditions))
            .orderBy(desc(prescription.createdAt))
            .limit(input.limit)
            .offset(offset),
          ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(prescription)
            .where(and(...conditions))
            .then((result) => result[0]?.count || 0),
        ]);

        return {
          prescriptions,
          total: totalCount,
          totalPages: Math.ceil(totalCount / input.limit),
          currentPage: input.page,
        };
      } catch (error) {
        console.error("Error fetching prescriptions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch prescriptions",
        });
      }
    }),

  // Get a single prescription by ID with all items
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid prescription ID") }))
    .query(async ({ ctx, input }) => {
      try {
        // Get prescription details
        const [prescriptionData] = await ctx.db
          .select({
            id: prescription.id,
            prescriptionNumber: prescription.prescriptionNumber,
            date: prescription.date,
            diagnosis: prescription.diagnosis,
            doctorName: prescription.doctorName,
            doctorSignature: prescription.doctorSignature,
            doctorLicenseNumber: prescription.doctorLicenseNumber,
            instructions: prescription.instructions,
            notes: prescription.notes,
            status: prescription.status,
            appointmentId: prescription.appointmentId,
            createdAt: prescription.createdAt,
            updatedAt: prescription.updatedAt,
            patient: {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              phoneNumber: patient.phoneNumber,
              age: patient.age,
              birthDate: patient.birthDate,
            },
            author: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          })
          .from(prescription)
          .innerJoin(patient, eq(prescription.patientId, patient.id))
          .innerJoin(user, eq(prescription.createdById, user.id))
          .where(
            and(
              eq(prescription.id, input.id),
              eq(prescription.organizationId, ctx.organization.id),
            ),
          );

        if (!prescriptionData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prescription not found in your organization",
          });
        }

        // Get prescription items
        const items = await ctx.db
          .select()
          .from(prescriptionItem)
          .where(eq(prescriptionItem.prescriptionId, input.id))
          .orderBy(prescriptionItem.order, prescriptionItem.createdAt);

        return {
          ...prescriptionData,
          items,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error fetching prescription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch prescription",
        });
      }
    }),

  // Create a new prescription
  create: organizationProcedure
    .input(createPrescriptionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify that the patient belongs to the organization
        const patientExists = await ctx.db
          .select({ id: patient.id })
          .from(patient)
          .innerJoin(
            patientOrganization,
            eq(patient.id, patientOrganization.patientId),
          )
          .where(
            and(
              eq(patient.id, input.patientId),
              eq(patientOrganization.organizationId, ctx.organization.id),
            ),
          );

        if (patientExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found in your organization",
          });
        }

        // Generate prescription number
        const prescriptionNumber = await generatePrescriptionNumber(
          ctx.db,
          ctx.organization.id,
        );

        // Start a transaction to ensure data consistency
        const result = await ctx.db.transaction(async (tx) => {
          // Create the prescription
          const [newPrescription] = await tx
            .insert(prescription)
            .values({
              patientId: input.patientId,
              organizationId: ctx.organization.id,
              prescriptionNumber,
              diagnosis: input.diagnosis,
              doctorName: input.doctorName,
              doctorSignature: input.doctorSignature,
              doctorLicenseNumber: input.doctorLicenseNumber,
              instructions: input.instructions,
              notes: input.notes,
              appointmentId: input.appointmentId,
              createdById: ctx.user.id,
            })
            .returning();

          // Create prescription items
          const prescriptionItems = await Promise.all(
            input.items.map((item, index) =>
              tx
                .insert(prescriptionItem)
                .values({
                  prescriptionId: newPrescription.id,
                  drugId: item.drugId,
                  customDrugId: item.customDrugId,
                  drugName: item.drugName,
                  drugDci: item.drugDci,
                  drugStrength: item.drugStrength,
                  drugForm: item.drugForm,
                  drugPresentation: item.drugPresentation,
                  dosage: item.dosage,
                  frequency: item.frequency,
                  duration: item.duration,
                  quantity: item.quantity,
                  instructions: item.instructions,
                  order: item.order || index,
                })
                .returning(),
            ),
          );

          return {
            ...newPrescription,
            items: prescriptionItems.flat(),
          };
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error creating prescription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create prescription",
        });
      }
    }),

  // Update a prescription
  update: organizationProcedure
    .input(updatePrescriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...updateData } = input;

      // Remove undefined values from update data
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined),
      );

      try {
        // First verify the prescription belongs to the organization
        const prescriptionExists = await ctx.db
          .select({ id: prescription.id })
          .from(prescription)
          .where(
            and(
              eq(prescription.id, id),
              eq(prescription.organizationId, ctx.organization.id),
            ),
          );

        if (prescriptionExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prescription not found in your organization",
          });
        }

        // If items are being updated, handle them in a transaction
        if (items) {
          const result = await ctx.db.transaction(async (tx) => {
            // Update prescription basic info
            const [updatedPrescription] = await tx
              .update(prescription)
              .set({
                ...cleanUpdateData,
                updatedAt: new Date(),
              })
              .where(eq(prescription.id, id))
              .returning();

            // Delete existing items and create new ones
            await tx
              .delete(prescriptionItem)
              .where(eq(prescriptionItem.prescriptionId, id));

            const prescriptionItems = await Promise.all(
              items.map((item, index) =>
                tx
                  .insert(prescriptionItem)
                  .values({
                    prescriptionId: id,
                    drugId: item.drugId,
                    customDrugId: item.customDrugId,
                    drugName: item.drugName,
                    drugDci: item.drugDci,
                    drugStrength: item.drugStrength,
                    drugForm: item.drugForm,
                    drugPresentation: item.drugPresentation,
                    dosage: item.dosage,
                    frequency: item.frequency,
                    duration: item.duration,
                    quantity: item.quantity,
                    instructions: item.instructions,
                    order: item.order || index,
                  })
                  .returning(),
              ),
            );

            return {
              ...updatedPrescription,
              items: prescriptionItems.flat(),
            };
          });

          return result;
        } else {
          // Update only basic prescription info
          const [updatedPrescription] = await ctx.db
            .update(prescription)
            .set({
              ...cleanUpdateData,
              updatedAt: new Date(),
            })
            .where(eq(prescription.id, id))
            .returning();

          return updatedPrescription;
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error updating prescription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update prescription",
        });
      }
    }),

  // Delete a prescription
  delete: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid prescription ID") }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First verify the prescription belongs to the organization
        const prescriptionExists = await ctx.db
          .select({ id: prescription.id })
          .from(prescription)
          .where(
            and(
              eq(prescription.id, input.id),
              eq(prescription.organizationId, ctx.organization.id),
            ),
          );

        if (prescriptionExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prescription not found in your organization",
          });
        }

        const [deletedPrescription] = await ctx.db
          .delete(prescription)
          .where(eq(prescription.id, input.id))
          .returning();

        return { success: true, deletedPrescription };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error deleting prescription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete prescription",
        });
      }
    }),

  // Get prescriptions for a specific patient
  getByPatient: organizationProcedure
    .input(
      z.object({
        patientId: z.string().uuid("Invalid patient ID"),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify that the patient belongs to the organization
        const patientExists = await ctx.db
          .select({ id: patient.id })
          .from(patient)
          .innerJoin(
            patientOrganization,
            eq(patient.id, patientOrganization.patientId),
          )
          .where(
            and(
              eq(patient.id, input.patientId),
              eq(patientOrganization.organizationId, ctx.organization.id),
            ),
          );

        if (patientExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Patient not found in your organization",
          });
        }

        const prescriptions = await ctx.db
          .select({
            id: prescription.id,
            prescriptionNumber: prescription.prescriptionNumber,
            date: prescription.date,
            diagnosis: prescription.diagnosis,
            doctorName: prescription.doctorName,
            instructions: prescription.instructions,
            notes: prescription.notes,
            status: prescription.status,
            createdAt: prescription.createdAt,
            author: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          })
          .from(prescription)
          .innerJoin(user, eq(prescription.createdById, user.id))
          .where(
            and(
              eq(prescription.patientId, input.patientId),
              eq(prescription.organizationId, ctx.organization.id),
            ),
          )
          .orderBy(desc(prescription.createdAt))
          .limit(input.limit);

        return prescriptions;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error fetching patient prescriptions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch patient prescriptions",
        });
      }
    }),

  // Duplicate a prescription
  duplicate: organizationProcedure
    .input(z.object({ id: z.string().uuid("Invalid prescription ID") }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the original prescription with items
        const originalPrescription = await ctx.db
          .select()
          .from(prescription)
          .where(
            and(
              eq(prescription.id, input.id),
              eq(prescription.organizationId, ctx.organization.id),
            ),
          )
          .limit(1);

        if (originalPrescription.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prescription not found in your organization",
          });
        }

        const original = originalPrescription[0]!;

        // Get the original items
        const originalItems = await ctx.db
          .select()
          .from(prescriptionItem)
          .where(eq(prescriptionItem.prescriptionId, input.id))
          .orderBy(prescriptionItem.order);

        // Generate new prescription number
        const prescriptionNumber = await generatePrescriptionNumber(
          ctx.db,
          ctx.organization.id,
        );

        // Create the duplicate in a transaction
        const result = await ctx.db.transaction(async (tx) => {
          // Create the new prescription
          const [newPrescription] = await tx
            .insert(prescription)
            .values({
              patientId: original.patientId,
              organizationId: ctx.organization.id,
              prescriptionNumber,
              diagnosis: original.diagnosis,
              doctorName: original.doctorName,
              doctorSignature: original.doctorSignature,
              doctorLicenseNumber: original.doctorLicenseNumber,
              instructions: original.instructions,
              notes: original.notes,
              appointmentId: null, // Don't link to the same appointment
              createdById: ctx.user.id,
              status: "active", // Reset to active
            })
            .returning();

          // Create the items
          const prescriptionItems = await Promise.all(
            originalItems.map((item) =>
              tx
                .insert(prescriptionItem)
                .values({
                  prescriptionId: newPrescription.id,
                  drugId: item.drugId,
                  customDrugId: item.customDrugId,
                  drugName: item.drugName,
                  drugDci: item.drugDci,
                  drugStrength: item.drugStrength,
                  drugForm: item.drugForm,
                  drugPresentation: item.drugPresentation,
                  dosage: item.dosage,
                  frequency: item.frequency,
                  duration: item.duration,
                  quantity: item.quantity,
                  instructions: item.instructions,
                  order: item.order,
                })
                .returning(),
            ),
          );

          return {
            ...newPrescription,
            items: prescriptionItems.flat(),
          };
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error duplicating prescription:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to duplicate prescription",
        });
      }
    }),
});
