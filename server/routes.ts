import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, segments, serviceQueues, queueItems } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Existing routes
  app.get("/api/songs", async (_req, res) => {
    try {
      const allSongs = await db
        .select()
        .from(songs)
        .leftJoin(segments, eq(songs.id, segments.songId))
        .orderBy(segments.order);

      const songsMap = new Map();
      allSongs.forEach((row) => {
        if (!songsMap.has(row.songs.id)) {
          songsMap.set(row.songs.id, {
            ...row.songs,
            segments: [],
          });
        }
        if (row.segments) {
          songsMap.get(row.songs.id).segments.push(row.segments);
        }
      });

      res.json(Array.from(songsMap.values()));
    } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ message: 'Failed to fetch songs' });
    }
  });

  app.post("/api/songs", async (req, res) => {
    try {
      const { title, author, segments: segmentData } = req.body;

      const [song] = await db
        .insert(songs)
        .values({ title, author })
        .returning();

      const songSegments = segmentData.map((segment: any, index: number) => ({
        songId: song.id,
        content: segment.content,
        type: segment.type,
        order: index + 1,
      }));

      await db.insert(segments).values(songSegments);

      res.json(song);
    } catch (error) {
      console.error('Error creating song:', error);
      res.status(500).json({ message: 'Failed to create song' });
    }
  });

  // New routes for service queues
  app.get("/api/queues", async (_req, res) => {
    try {
      const allQueues = await db.select().from(serviceQueues);
      res.json(allQueues);
    } catch (error) {
      console.error('Error fetching queues:', error);
      res.status(500).json({ message: 'Failed to fetch queues' });
    }
  });

  app.post("/api/queues", async (req, res) => {
    try {
      const { name, date } = req.body;
      const [queue] = await db
        .insert(serviceQueues)
        .values({ name, date })
        .returning();
      res.json(queue);
    } catch (error) {
      console.error('Error creating queue:', error);
      res.status(500).json({ message: 'Failed to create queue' });
    }
  });

  app.post("/api/queues/:queueId/songs", async (req, res) => {
    try {
      const { queueId } = req.params;
      const { songId } = req.body;

      // Get the current highest order
      const currentItems = await db
        .select()
        .from(queueItems)
        .where(eq(queueItems.queueId, parseInt(queueId)));

      const order = currentItems.length + 1;

      const [item] = await db
        .insert(queueItems)
        .values({
          queueId: parseInt(queueId),
          songId: parseInt(songId),
          order,
        })
        .returning();

      res.json(item);
    } catch (error) {
      console.error('Error adding song to queue:', error);
      res.status(500).json({ message: 'Failed to add song to queue' });
    }
  });

  app.delete("/api/songs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(songs).where(eq(songs.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({ message: 'Failed to delete song' });
    }
  });

  return httpServer;
}