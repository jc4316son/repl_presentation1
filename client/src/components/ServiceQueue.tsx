import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceQueue, QueueItem, Song, Segment } from "@db/schema";
import { format } from "date-fns";
import { Calendar, GripVertical, Plus } from "lucide-react";
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

  const createQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Service ${format(new Date(), "PPP")}`,
          date: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create queue");
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

  const reorderMutation = useMutation({
    mutationFn: async ({ queueId, itemId, newOrder }: { queueId: number, itemId: number, newOrder: number }) => {
      const res = await fetch(`/api/queues/${queueId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder queue items");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({ title: "Queue order updated" });
    },
    onError: () => {
      toast({ title: "Failed to update queue order", variant: "destructive" });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const [queueId, itemId] = result.active.id.split('-');
    reorderMutation.mutate({
      queueId: parseInt(queueId),
      itemId: parseInt(itemId),
      newOrder: result.destination.index + 1,
    });
  };

  if (!queues?.length) {
    return (
      <div className="text-center py-8">
        <p className="mb-4">No service queue available</p>
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
                          <h4 className="font-medium mb-2">{item.song.title}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {item.song.segments.map((segment) => (
                              <Button
                                key={segment.id}
                                variant="outline"
                                size="sm"
                                className="justify-start"
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