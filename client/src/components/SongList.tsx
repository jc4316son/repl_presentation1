import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Song, ServiceQueue } from "@db/schema";
import { Edit, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SongForm from "./SongForm";
import { format } from "date-fns";

interface SongListProps {
  displayWindow: Window | null;
}

export default function SongList({ displayWindow }: SongListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const { data: songs, isLoading: isSongsLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: queues, isLoading: isQueuesLoading } = useQuery<ServiceQueue[]>({
    queryKey: ["/api/queues"],
  });

  const createQueueMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Service ${format(now, "PPP")}`,
          date: now.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create queue");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Service queue created" });
    },
    onError: () => {
      toast({ title: "Failed to create queue", variant: "destructive" });
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async ({ queueId, songId }: { queueId: number; songId: number }) => {
      const res = await fetch(`/api/queues/${queueId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });

      if (!res.ok) {
        throw new Error("Failed to add song to queue");
      }

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

  // Loading state
  if (isSongsLoading || isQueuesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // No songs state
  if (!songs?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No songs available</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Song
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Add New Song</DialogTitle>
            <SongForm />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const latestQueue = queues && queues.length > 0 ? queues[0] : null;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Available Songs</h2>
        {!latestQueue && (
          <Button onClick={() => createQueueMutation.mutate()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Service Queue
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {songs.map((song) => (
          <Card key={song.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{song.title}</h3>
                  <p className="text-sm text-muted-foreground">{song.author}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSong(song)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {latestQueue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addToQueueMutation.mutate({
                          queueId: latestQueue.id,
                          songId: song.id,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Queue
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingSong} onOpenChange={() => setEditingSong(null)}>
        <DialogContent>
          <DialogTitle>Edit Song</DialogTitle>
          {editingSong && <SongForm editingSong={editingSong} onSuccess={() => setEditingSong(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}