import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, segments, serviceQueues, queueItems } from "@db/schema";
import { eq, sql, and } from "drizzle-orm";

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

  // Queue routes
  app.get("/api/queues", async (_req, res) => {
    try {
      console.log("Fetching queues...");
      const queues = await db
        .select()
        .from(serviceQueues)
        .orderBy(sql`${serviceQueues.createdAt} DESC`);

      console.log("Found queues:", queues);
      res.json(queues);
    } catch (error) {
      console.error('Error fetching queues:', error);
      res.status(500).json({ message: 'Failed to fetch queues' });
    }
  });

  app.post("/api/queues", async (req, res) => {
    try {
      console.log("Creating queue with data:", req.body);
      const { name, date } = req.body;
      const [queue] = await db
        .insert(serviceQueues)
        .values({ 
          name, 
          date: new Date(date)
        })
        .returning();

      console.log("Created queue:", queue);
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

  app.post("/api/queues/:queueId/reorder", async (req, res) => {
    try {
      const { queueId } = req.params;
      const { itemId, newOrder } = req.body;

      // Get all items in the queue
      const items = await db
        .select()
        .from(queueItems)
        .where(eq(queueItems.queueId, parseInt(queueId)))
        .orderBy(queueItems.order);

      // Find the item being moved
      const itemIndex = items.findIndex(item => item.id === parseInt(itemId));
      const item = items[itemIndex];
      const oldOrder = item.order;

      // Calculate the new orders
      if (newOrder > oldOrder) {
        // Moving down
        await db.execute(sql`
          UPDATE queue_items
          SET "order" = "order" - 1
          WHERE queue_id = ${parseInt(queueId)}
          AND "order" > ${oldOrder}
          AND "order" <= ${newOrder}
        `);
      } else {
        // Moving up
        await db.execute(sql`
          UPDATE queue_items
          SET "order" = "order" + 1
          WHERE queue_id = ${parseInt(queueId)}
          AND "order" >= ${newOrder}
          AND "order" < ${oldOrder}
        `);
      }

      // Update the moved item's order
      await db.execute(sql`
        UPDATE queue_items
        SET "order" = ${newOrder}
        WHERE id = ${parseInt(itemId)}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering queue items:', error);
      res.status(500).json({ message: 'Failed to reorder queue items' });
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