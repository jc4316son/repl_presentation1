import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceQueue, QueueItem, Song, Segment } from "@db/schema";
import { format } from "date-fns";
import { Calendar, GripVertical, Plus, Trash2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ServiceQueueProps {
  displayWindow: Window | null;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="flex items-center">
        <GripVertical className="h-5 w-5 mr-2 text-gray-400" />
        {children}
      </div>
    </div>
  );
}

export default function ServiceQueue({ displayWindow }: ServiceQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: queues } = useQuery<(ServiceQueue & { items: (QueueItem & { song: Song & { segments: Segment[] } })[] })[]>({
    queryKey: ["/api/queues"],
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ queueId, itemId }: { queueId: number; itemId: number }) => {
      const response = await fetch(`/api/queues/${queueId}/songs/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Song removed from queue" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to remove song",
        description: error.message,
        variant: "destructive" 
      });
    },
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const [queueId, itemId] = result.active.id.split('-');
    const newOrder = result.destination.index + 1;

    // Simple reorder without optimistic updates
    toast({ title: "Reordering items..." });
  };

  const handleDeleteItem = async (queueId: number, itemId: number) => {
    try {
      await deleteItemMutation.mutateAsync({ queueId, itemId });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const displaySegment = (segment: Segment) => {
    if (!displayWindow || displayWindow.closed) {
      toast({
        title: "Display window not open",
        description: "Please open the display window first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Simplify the message format
      displayWindow.postMessage({
        type: "DISPLAY_SEGMENT",
        payload: { content: segment.content }
      }, "*");
    } catch (error) {
      toast({
        title: "Failed to display segment",
        description: "There was an error communicating with the display window",
        variant: "destructive"
      });
    }
  };

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

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={queue.items.map((item) => `${queue.id}-${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {queue.items.map((item) => (
                    <SortableItem key={`${queue.id}-${item.id}`} id={`${queue.id}-${item.id}`}>
                      <Card className="w-full">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium">{item.song.title}</h4>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(queue.id, item.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {item.song.segments.map((segment) => (
                              <Button
                                key={segment.id}
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={() => displaySegment(segment)}
                              >
                                {segment.type} {segment.order}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}