// Client-side exports
export { authClient } from "./auth/auth-client";
export { cn } from "./lib/utils";

import { config } from "dotenv";
config();

// Server-side exports (use dynamic imports or separate entry points)
export { auth } from "./auth/auth";
export { db } from "./db";
export * from "./db/schema";
export { emailService } from "./lib/email";
