import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Song, Segment, ServiceQueue } from "@db/schema";
import { synchronizeDisplay } from "@/lib/display-sync";
import { Plus } from "lucide-react";

interface SongListProps {
  displayWindow: Window | null;
}

export default function SongList({ displayWindow }: SongListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: songs } = useQuery<(Song & { segments: Segment[] })[]>({
    queryKey: ["/api/songs"],
  });

  const { data: queues } = useQuery<ServiceQueue[]>({
    queryKey: ["/api/queues"],
  });

  const addToQueueMutation = useMutation({
    mutationFn: async ({ queueId, songId }: { queueId: number; songId: number }) => {
      const res = await fetch(`/api/queues/${queueId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      if (!res.ok) throw new Error("Failed to add song to queue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Song added to queue" });
    },
    onError: () => {
      toast({ title: "Failed to add song to queue", variant: "destructive" });
    },
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

  const latestQueue = queues?.[queues.length - 1];

  return (
    <div className="space-y-4">
      {songs.map((song) => (
        <Card key={song.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">{song.title}</h3>
                <p className="text-sm text-muted-foreground">{song.author}</p>
              </div>
              {latestQueue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addToQueueMutation.mutate({
                    queueId: latestQueue.id,
                    songId: song.id,
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Queue
                </Button>
              )}
            </div>
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