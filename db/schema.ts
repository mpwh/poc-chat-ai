import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  file_url: text("file_url").notNull(),
  file_type: text("file_type").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  document_id: integer("document_id").references(() => documents.id).notNull(),
  title: text("title").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  chat_id: integer("chat_id").references(() => chats.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

// Schema types
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

export type User = z.infer<typeof selectUserSchema>;
export type Document = z.infer<typeof selectDocumentSchema>;
export type Chat = z.infer<typeof selectChatSchema>;
export type Message = z.infer<typeof selectMessageSchema>;
