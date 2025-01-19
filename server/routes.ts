import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, segments, serviceQueues, queueItems } from "@db/schema";
import { eq, sql } from "drizzle-orm";

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

  // Queue routes
  app.get("/api/queues", async (_req, res) => {
    try {
      const queues = await db
        .select()
        .from(serviceQueues)
        .leftJoin(queueItems, eq(serviceQueues.id, queueItems.queueId))
        .leftJoin(songs, eq(queueItems.songId, songs.id))
        .leftJoin(segments, eq(songs.id, segments.songId));

      const queuesMap = new Map();
      queues.forEach((row) => {
        if (!queuesMap.has(row.service_queues.id)) {
          queuesMap.set(row.service_queues.id, {
            ...row.service_queues,
            items: new Map(),
          });
        }

        if (row.queue_items) {
          const queue = queuesMap.get(row.service_queues.id);
          if (!queue.items.has(row.queue_items.id)) {
            queue.items.set(row.queue_items.id, {
              ...row.queue_items,
              song: {
                ...row.songs,
                segments: [],
              },
            });
          }

          if (row.segments) {
            queue.items.get(row.queue_items.id).song.segments.push(row.segments);
          }
        }
      });

      const formattedQueues = Array.from(queuesMap.values()).map(queue => ({
        ...queue,
        items: Array.from(queue.items.values()).sort((a, b) => a.order - b.order),
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