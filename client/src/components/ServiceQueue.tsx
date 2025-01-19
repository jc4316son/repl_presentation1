import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceQueue, QueueItem, Song } from "@db/schema";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@dnd-kit/core";

interface ServiceQueueProps {
  displayWindow: Window | null;
}

export default function ServiceQueue({ displayWindow }: ServiceQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queues } = useQuery<ServiceQueue[]>({
    queryKey: ["/api/queues"],
  });

  const { data: songs } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const createQueueMutation = useMutation({
    mutationFn: async (data: { name: string; date: Date }) => {
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create service queue");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Service queue created" });
    },
    onError: () => {
      toast({ title: "Failed to create service queue", variant: "destructive" });
    },
  });

  const addSongToQueueMutation = useMutation({
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

  if (!queues?.length) {
    return <div className="text-center py-8">No service queues available</div>;
  }

  return (
    <div className="space-y-6">
      {queues.map((queue) => (
        <Card key={queue.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{queue.name}</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(queue.date), "PPP")}
              </div>
            </div>
            
            {/* Add song selection and queue management here */}
            <div className="space-y-2">
              {songs?.map((song) => (
                <Button
                  key={song.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => addSongToQueueMutation.mutate({ queueId: queue.id, songId: song.id })}
                >
                  {song.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
