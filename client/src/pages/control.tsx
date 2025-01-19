import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongForm from "@/components/SongForm";
import SongList from "@/components/SongList";
import ServiceQueue from "@/components/ServiceQueue";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Control() {
  const displayWindowRef = useRef<Window | null>(null);
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);
  const { toast } = useToast();

  const openDisplay = () => {
    if (displayWindowRef.current?.closed) {
      displayWindowRef.current = null;
      setIsDisplayOpen(false);
    }

    if (!displayWindowRef.current) {
      const newWindow = window.open("/display", "presentation", "width=800,height=600");
      displayWindowRef.current = newWindow;
      setIsDisplayOpen(!!newWindow);

      if (!newWindow) {
        toast({
          title: "Could not open display window",
          description: "Please allow pop-ups for this site",
          variant: "destructive"
        });
      }
    } else {
      displayWindowRef.current.focus();
    }
  };

  useEffect(() => {
    const checkWindow = setInterval(() => {
      if (displayWindowRef.current?.closed) {
        displayWindowRef.current = null;
        setIsDisplayOpen(false);
      }
    }, 1000);

    return () => {
      clearInterval(checkWindow);
      displayWindowRef.current?.close();
    };
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Church Presentation System</h1>
        <Button onClick={openDisplay} variant={isDisplayOpen ? "outline" : "default"}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {isDisplayOpen ? "Display Window Open" : "Open Display"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="songs">
            <TabsList>
              <TabsTrigger value="songs">Songs</TabsTrigger>
              <TabsTrigger value="new">New Song</TabsTrigger>
              <TabsTrigger value="queue">Service Queue</TabsTrigger>
            </TabsList>
            <TabsContent value="songs">
              <SongList displayWindow={displayWindowRef.current} />
            </TabsContent>
            <TabsContent value="new">
              <SongForm />
            </TabsContent>
            <TabsContent value="queue">
              <ServiceQueue displayWindow={displayWindowRef.current} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}