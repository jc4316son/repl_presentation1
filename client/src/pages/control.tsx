import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongForm from "@/components/SongForm";
import SongList from "@/components/SongList";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

export default function Control() {
  const [displayWindow, setDisplayWindow] = useState<Window | null>(null);

  const openDisplay = () => {
    const display = window.open("/display", "presentation", "width=800,height=600");
    setDisplayWindow(display);
  };

  useEffect(() => {
    return () => {
      displayWindow?.close();
    };
  }, [displayWindow]);

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
            </TabsList>
            <TabsContent value="songs">
              <SongList displayWindow={displayWindow} />
            </TabsContent>
            <TabsContent value="new">
              <SongForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
