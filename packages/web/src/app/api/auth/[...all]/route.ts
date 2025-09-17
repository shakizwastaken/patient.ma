import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@acme/shared/server";

export const { GET, POST } = toNextJsHandler(auth.handler);
