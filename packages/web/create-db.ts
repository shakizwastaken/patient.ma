import { env } from "@/env";
import postgres from "postgres";

const databaseUrl = env.DATABASE_URL;
const databaseName = databaseUrl.split("/").pop();
if (!databaseName) throw new Error("Database name not found");

const psql = postgres(env.DATABASE_URL.replace(databaseName, ""));

const resetDatabase = async () => {
  await psql.unsafe(`drop database if exists "${databaseName}";`);
  console.log("Database dropped");
  await psql.unsafe(`create database "${databaseName}";`);
  console.log("Database created");
};

await resetDatabase();

process.exit();
