import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Song, ServiceQueue } from "@db/schema";
import { Edit, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SongForm from "./SongForm";
import { format } from "date-fns";

interface SongListProps {
  displayWindow: Window | null;
}

export default function SongList({ displayWindow }: SongListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const { data: songs } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: queues, onSuccess, onError } = useQuery<ServiceQueue[]>({
    queryKey: ["/api/queues"],
    onSuccess: (data) => {
      console.log("Queues loaded:", data);
    },
    onError: (error) => {
      console.error("Error loading queues:", error);
      toast({ 
        title: "Failed to load queues",
        variant: "destructive"
      });
    }
  });

  const createQueueMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const data = {
        name: `Service ${format(now, "PPP")}`,
        date: now.toISOString(),
      };
      console.log("Creating queue with data:", data);

      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to create queue: ${error}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Service queue created" });
    },
    onError: (error) => {
      console.error("Queue creation error:", error);
      toast({ 
        title: "Failed to create queue",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async ({ queueId, songId }: { queueId: number; songId: number }) => {
      console.log("Adding song to queue:", { queueId, songId });
      const res = await fetch(`/api/queues/${queueId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to add song to queue: ${error}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Song added to queue" });
    },
    onError: (error) => {
      console.error("Add to queue error:", error);
      toast({ 
        title: "Failed to add song to queue",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  if (!songs?.length) {
    return <div className="text-center py-8">No songs available</div>;
  }

  const latestQueue = queues?.[0]; // Get the most recent queue (first in the array since we're ordering by DESC)

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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!latestQueue}
                    onClick={() => {
                      if (latestQueue) {
                        addToQueueMutation.mutate({
                          queueId: latestQueue.id,
                          songId: song.id,
                        });
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Queue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingSong} onOpenChange={() => setEditingSong(null)}>
        <DialogContent className="max-w-2xl">
          {editingSong && <SongForm editingSong={editingSong} onSuccess={() => setEditingSong(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}