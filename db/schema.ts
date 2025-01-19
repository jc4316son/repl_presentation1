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

export const serviceQueues = pgTable("service_queues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const queueItems = pgTable("queue_items", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").references(() => serviceQueues.id).notNull(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define the relations
export const songsRelations = relations(songs, ({ many }) => ({
  segments: many(segments),
  queueItems: many(queueItems),
}));

export const segmentsRelations = relations(segments, ({ one }) => ({
  song: one(songs, {
    fields: [segments.songId],
    references: [songs.id],
  }),
}));

export const serviceQueuesRelations = relations(serviceQueues, ({ many }) => ({
  items: many(queueItems),
}));

export const queueItemsRelations = relations(queueItems, ({ one }) => ({
  queue: one(serviceQueues, {
    fields: [queueItems.queueId],
    references: [serviceQueues.id],
  }),
  song: one(songs, {
    fields: [queueItems.songId],
    references: [songs.id],
  }),
}));

export const insertSongSchema = createInsertSchema(songs);
export const selectSongSchema = createSelectSchema(songs);
export const insertSegmentSchema = createInsertSchema(segments);
export const selectSegmentSchema = createSelectSchema(segments);
export const insertServiceQueueSchema = createInsertSchema(serviceQueues);
export const selectServiceQueueSchema = createSelectSchema(serviceQueues);
export const insertQueueItemSchema = createInsertSchema(queueItems);
export const selectQueueItemSchema = createSelectSchema(queueItems);

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;
export type ServiceQueue = typeof serviceQueues.$inferSelect;
export type NewServiceQueue = typeof serviceQueues.$inferInsert;
export type QueueItem = typeof queueItems.$inferSelect;
export type NewQueueItem = typeof queueItems.$inferInsert;