import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SongFormData {
  title: string;
  author: string;
  segments: { content: string; type: string }[];
}

export default function SongForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<SongFormData>({
    defaultValues: {
      title: "",
      author: "",
      segments: [{ content: "", type: "verse" }],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SongFormData) => {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create song");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song created successfully" });
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create song", variant: "destructive" });
    },
  });

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

        <FormField
          control={form.control}
          name="segments.0.content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lyrics</FormLabel>
              <FormControl>
                <Textarea {...field} rows={10} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Create Song</Button>
      </form>
    </Form>
  );
}
