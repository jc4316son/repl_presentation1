import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, segments, serviceQueues, queueItems } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/songs", async (_req, res) => {
    try {
      const allSongs = await db
        .select()
        .from(songs)
        .orderBy(songs.title);

      res.json(allSongs);
    } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ message: 'Failed to fetch songs' });
    }
  });

  app.get("/api/songs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const songSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.songId, parseInt(id)))
        .orderBy(segments.order);

      res.json(songSegments);
    } catch (error) {
      console.error('Error fetching song segments:', error);
      res.status(500).json({ message: 'Failed to fetch song segments' });
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

  app.put("/api/songs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, author, segments: segmentData } = req.body;

      // Update song details
      await db
        .update(songs)
        .set({ title, author })
        .where(eq(songs.id, parseInt(id)));

      // Delete existing segments
      await db
        .delete(segments)
        .where(eq(segments.songId, parseInt(id)));

      // Insert new segments
      const songSegments = segmentData.map((segment: any, index: number) => ({
        songId: parseInt(id),
        content: segment.content,
        type: segment.type,
        order: index + 1,
      }));

      await db.insert(segments).values(songSegments);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating song:', error);
      res.status(500).json({ message: 'Failed to update song' });
    }
  });

  app.delete("/api/songs/:songId/segments/:segmentId", async (req, res) => {
    try {
      const { songId, segmentId } = req.params;

      // Delete the segment
      await db
        .delete(segments)
        .where(sql`${segments.id} = ${segmentId} AND ${segments.songId} = ${songId}`);

      // Get remaining segments to reorder them
      const remainingSegments = await db
        .select()
        .from(segments)
        .where(eq(segments.songId, parseInt(songId)))
        .orderBy(segments.order);

      // Update order of remaining segments
      for (let i = 0; i < remainingSegments.length; i++) {
        await db
          .update(segments)
          .set({ order: i + 1 })
          .where(eq(segments.id, remainingSegments[i].id));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting segment:', error);
      res.status(500).json({ message: 'Failed to delete segment' });
    }
  });

  // Queue routes
  app.get("/api/queues", async (_req, res) => {
    try {
      const allQueues = await db
        .select({
          id: serviceQueues.id,
          name: serviceQueues.name,
          date: serviceQueues.date,
          createdAt: serviceQueues.createdAt,
          updatedAt: serviceQueues.updatedAt,
          items: sql`json_agg(
            CASE WHEN ${queueItems.id} IS NOT NULL THEN
              json_build_object(
                'id', ${queueItems.id},
                'order', ${queueItems.order},
                'song', (
                  SELECT json_build_object(
                    'id', s.id,
                    'title', s.title,
                    'author', s.author,
                    'segments', (
                      SELECT json_agg(
                        json_build_object(
                          'id', seg.id,
                          'content', seg.content,
                          'type', seg.type,
                          'order', seg.order
                        ) ORDER BY seg.order
                      )
                      FROM ${segments} seg
                      WHERE seg.song_id = s.id
                    )
                  )
                  FROM ${songs} s
                  WHERE s.id = ${queueItems.songId}
                )
              )
            ELSE NULL
            END ORDER BY ${queueItems.order}
          )`
        })
        .from(serviceQueues)
        .leftJoin(queueItems, eq(serviceQueues.id, queueItems.queueId))
        .groupBy(serviceQueues.id)
        .orderBy(sql`${serviceQueues.createdAt} DESC`);

      // Format the response to handle null cases for items
      const formattedQueues = allQueues.map(queue => ({
        ...queue,
        items: queue.items[0] === null ? [] : queue.items.filter(Boolean)
      }));

      res.json(formattedQueues);
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
        .values({ 
          name, 
          date: new Date(date)
        })
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

  app.delete("/api/queues/:queueId/songs/:itemId", async (req, res) => {
    try {
      const { queueId, itemId } = req.params;

      // Delete the queue item
      const result = await db
        .delete(queueItems)
        .where(eq(queueItems.id, parseInt(itemId)))
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: 'Queue item not found' });
      }

      // Get remaining items to reorder them
      const remainingItems = await db
        .select()
        .from(queueItems)
        .where(eq(queueItems.queueId, parseInt(queueId)))
        .orderBy(queueItems.order);

      // Update order of remaining items
      for (let i = 0; i < remainingItems.length; i++) {
        await db
          .update(queueItems)
          .set({ order: i + 1 })
          .where(eq(queueItems.id, remainingItems[i].id));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing song from queue:', error);
      res.status(500).json({ message: 'Failed to remove song from queue' });
    }
  });

  return httpServer;
}