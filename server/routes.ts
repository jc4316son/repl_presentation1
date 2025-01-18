import type { Express } from "express";
import { createServer } from "http";
import { db } from "@db";
import { songs, segments } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/songs", async (_req, res) => {
    try {
      const allSongs = await db
        .select()
        .from(songs)
        .leftJoin(segments, eq(songs.id, segments.songId))
        .orderBy(segments.order);

      // Transform the flat results into nested structure
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