import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus } from "lucide-react";
import type { Song } from "@db/schema";

interface Segment {
  content: string;
  type: string;
}

interface SongFormData {
  title: string;
  author: string;
  segments: Segment[];
}

const SEGMENT_TYPES = [
  "verse",
  "chorus",
  "bridge",
  "pre-chorus",
  "ending",
] as const;

interface SongFormProps {
  editingSong?: Song;
  onSuccess?: () => void;
}

export default function SongForm({ editingSong, onSuccess }: SongFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<SongFormData>({
    defaultValues: editingSong ? {
      title: editingSong.title,
      author: editingSong.author || "",
      segments: [], // We'll need to fetch segments separately
    } : {
      title: "",
      author: "",
      segments: [{ content: "", type: "verse" }],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SongFormData) => {
      const res = await fetch(editingSong ? `/api/songs/${editingSong.id}` : "/api/songs", {
        method: editingSong ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to ${editingSong ? 'update' : 'create'} song`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: `Song ${editingSong ? 'updated' : 'created'} successfully` });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({ title: `Failed to ${editingSong ? 'update' : 'create'} song`, variant: "destructive" });
    },
  });

  const addSegment = () => {
    const segments = form.getValues("segments");
    form.setValue("segments", [...segments, { content: "", type: "verse" }]);
  };

  const removeSegment = (index: number) => {
    const segments = form.getValues("segments");
    if (segments.length > 1) {
      form.setValue("segments", segments.filter((_, i) => i !== index));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          {form.watch("segments").map((segment, index) => (
            <div key={index} className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <FormField
                  control={form.control}
                  name={`segments.${index}.type`}
                  render={({ field }) => (
                    <FormItem className="w-48">
                      <FormLabel>Segment Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEGMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeSegment(index)}
                  disabled={form.watch("segments").length === 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              <FormField
                control={form.control}
                name={`segments.${index}.content`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lyrics</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addSegment}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Segment
        </Button>

        <Button type="submit" className="w-full">
          {editingSong ? 'Update Song' : 'Create Song'}
        </Button>
      </form>
    </Form>
  );
}