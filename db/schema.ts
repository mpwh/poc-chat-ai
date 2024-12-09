import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  file_type: text("file_type").notNull(),
  file_url: text("file_url"),
  user_id: integer("user_id").references(() => users.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

const userSchema = createSelectSchema(users);
const documentSchema = createSelectSchema(documents);

export type User = z.infer<typeof userSchema>;
export type Document = z.infer<typeof documentSchema>;

// Insert schemas for validation
export const insertUserSchema = userSchema.omit({ 
  id: true,
  created_at: true 
});

export const insertDocumentSchema = documentSchema.omit({ 
  id: true,
  created_at: true 
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
