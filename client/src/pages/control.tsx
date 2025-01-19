import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongForm from "@/components/SongForm";
import SongList from "@/components/SongList";
import ServiceQueue from "@/components/ServiceQueue";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";

export default function Control() {
  const displayWindowRef = useRef<Window | null>(null);

  const openDisplay = () => {
    if (displayWindowRef.current?.closed) {
      displayWindowRef.current = null;
    }

    if (!displayWindowRef.current) {
      displayWindowRef.current = window.open("/display", "presentation", "width=800,height=600");
    } else {
      displayWindowRef.current.focus();
    }
  };

  useEffect(() => {
    return () => {
      displayWindowRef.current?.close();
    };
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Church Presentation System</h1>
        <Button onClick={openDisplay}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Display
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