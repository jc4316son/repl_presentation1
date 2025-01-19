import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceQueue, QueueItem, Song, Segment } from "@db/schema";
import { format } from "date-fns";
import { Calendar, Plus, Trash2, Loader2 } from "lucide-react";
import { displayManager } from "@/lib/display-sync";

export default function ServiceQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queues, isLoading: isQueuesLoading } = useQuery<(ServiceQueue & { 
    items: (QueueItem & { 
      song: Song & { 
        segments: Segment[] 
      } 
    })[] 
  })[]>({
    queryKey: ["/api/queues"],
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ queueId, itemId }: { queueId: number; itemId: number }) => {
      const response = await fetch(`/api/queues/${queueId}/songs/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Song removed from queue" });
    },
    onError: () => {
      toast({ title: "Failed to remove song", variant: "destructive" });
    },
  });

  const createQueueMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Service ${format(now, "PPP")}`,
          date: now.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create queue");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Service queue created" });
    },
    onError: () => {
      toast({ title: "Failed to create queue", variant: "destructive" });
    },
  });

  const displaySegment = (content: string) => {
    displayManager.displayContent(content);
  };

  // Loading state
  if (isQueuesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!queues?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No service queue available</p>
        <Button onClick={() => createQueueMutation.mutate()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Service Queue
        </Button>
      </div>
    );
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

            <div className="space-y-4">
              {queue.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">{item.song.title}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteItemMutation.mutate({ queueId: queue.id, itemId: item.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {item.song.segments.map((segment) => (
                        <Button
                          key={segment.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={() => displaySegment(segment.content)}
                        >
                          {segment.type} {segment.order}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}