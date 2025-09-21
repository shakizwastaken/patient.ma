import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  stripeCustomerId: text("stripe_customer_id"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
  activeOrganizationId: text("active_organization_id"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  description: text("description"), // Organization description for public booking and general use
  timezone: text("timezone").default("Africa/Casablanca").notNull(), // Default to Casablanca timezone
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
  // Google Calendar Integration
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiresAt: timestamp("google_token_expires_at"),
  googleCalendarId: text("google_calendar_id"),
  googleIntegrationEnabled: boolean("google_integration_enabled").default(
    false,
  ),
  // Public booking settings - use organization slug as public booking URL
  publicBookingEnabled: boolean("public_booking_enabled").default(false),
  // Stripe Integration for payments
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeEnabled: boolean("stripe_enabled").default(false),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  referenceId: text("reference_id").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").default("incomplete"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  seats: integer("seats"),
});

export const plan = pgTable("plan", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeAnnualPriceId: text("stripe_annual_price_id"),
  type: text("type").notNull().default("subscription"), // "subscription" or "one_time"
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  trialPeriodDays: integer("trial_period_days"),
  limits: text("limits"), // JSON string of plan limits
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const patient = pgTable("patient", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  age: integer("age"),
  birthDate: timestamp("birth_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const patientOrganization = pgTable("patient_organization", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patient.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationAppointmentType = pgTable(
  "organization_appointment_type",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(), // e.g., "Consultation", "Suivi", "Urgence"
    description: text("description"),
    defaultDurationMinutes: integer("default_duration_minutes")
      .notNull()
      .default(30),
    color: text("color").default("#3b82f6"), // Hex color for calendar display
    isActive: boolean("is_active").default(true).notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

export const appointment = pgTable("appointment", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled, completed, cancelled, no_show
  type: text("type").default("consultation").notNull(), // consultation, follow_up, emergency, etc.
  appointmentTypeId: uuid("appointment_type_id").references(
    () => organizationAppointmentType.id,
    { onDelete: "set null" },
  ),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patient.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "cascade",
  }), // Made nullable for public bookings
  notes: text("notes"),
  // Google Meet integration
  meetingLink: text("meeting_link"),
  meetingId: text("meeting_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Organization availability schedule - defines when the clinic is open
export const organizationAvailability = pgTable("organization_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: text("start_time").notNull(), // "09:00" format
  endTime: text("end_time").notNull(), // "17:00" format
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Organization schedule overrides (holidays, maintenance, special hours, etc.)
export const organizationScheduleOverride = pgTable(
  "organization_schedule_override",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    startTime: text("start_time"), // Optional: specific start time for this override
    endTime: text("end_time"), // Optional: specific end time for this override
    type: text("type").default("unavailable").notNull(), // unavailable, reduced_hours, maintenance, holiday
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurringPattern: text("recurring_pattern"), // JSON string for recurring rules
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

// Organization appointment configuration
export const organizationAppointmentConfig = pgTable(
  "organization_appointment_config",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slotDurationMinutes: integer("slot_duration_minutes").default(30).notNull(), // 15, 30, 45, 60
    bufferTimeMinutes: integer("buffer_time_minutes").default(0).notNull(), // Time between appointments
    advanceBookingDays: integer("advance_booking_days").default(30).notNull(), // How far in advance bookings allowed
    sameDayBookingAllowed: boolean("same_day_booking_allowed")
      .default(true)
      .notNull(),
    maxAppointmentsPerDay: integer("max_appointments_per_day"), // Optional: limit daily appointments
    // Online conferencing settings
    onlineConferencingEnabled: boolean("online_conferencing_enabled")
      .default(false)
      .notNull(),
    onlineConferencingAppointmentTypeId: uuid(
      "online_conferencing_appointment_type_id",
    ).references(() => organizationAppointmentType.id, {
      onDelete: "set null",
    }),
    // Public booking settings
    publicBookingEnabled: boolean("public_booking_enabled")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);
