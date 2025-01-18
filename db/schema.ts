import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const segments = pgTable("segments", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  content: text("content").notNull(),
  order: integer("order").notNull(),
  type: text("type").notNull(), // verse, chorus, bridge, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define the relations
export const songsRelations = relations(songs, ({ many }) => ({
  segments: many(segments),
}));

export const segmentsRelations = relations(segments, ({ one }) => ({
  song: one(songs, {
    fields: [segments.songId],
    references: [songs.id],
  }),
}));

export const insertSongSchema = createInsertSchema(songs);
export const selectSongSchema = createSelectSchema(songs);
export const insertSegmentSchema = createInsertSchema(segments);
export const selectSegmentSchema = createSelectSchema(segments);

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;