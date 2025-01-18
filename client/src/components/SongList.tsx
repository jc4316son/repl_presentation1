import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Song, Segment } from "@db/schema";
import { synchronizeDisplay } from "@/lib/display-sync";

interface SongListProps {
  displayWindow: Window | null;
}

export default function SongList({ displayWindow }: SongListProps) {
  const { data: songs } = useQuery<(Song & { segments: Segment[] })[]>({
    queryKey: ["/api/songs"],
  });

  const displaySegment = (songId: number, segmentId: number) => {
    if (!displayWindow) return;
    const song = songs?.find((s) => s.id === songId);
    const segment = song?.segments.find((s) => s.id === segmentId);
    if (segment) {
      synchronizeDisplay(displayWindow, {
        type: "DISPLAY_SEGMENT",
        payload: { content: segment.content },
      });
    }
  };

  if (!songs?.length) {
    return <div className="text-center py-8">No songs available</div>;
  }

  return (
    <div className="space-y-4">
      {songs.map((song) => (
        <Card key={song.id}>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">{song.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{song.author}</p>
            <div className="grid grid-cols-2 gap-2">
              {song.segments.map((segment) => (
                <Button
                  key={segment.id}
                  variant="outline"
                  onClick={() => displaySegment(song.id, segment.id)}
                >
                  {segment.type} {segment.order}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
