import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongForm from "@/components/SongForm";
import SongList from "@/components/SongList";
import ServiceQueue from "@/components/ServiceQueue";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { displayManager } from "@/lib/display-sync";

export default function Control() {
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);

  const toggleDisplay = () => {
    if (!isDisplayOpen) {
      displayManager.openDisplay();
    } else {
      displayManager.closeDisplay();
    }
    setIsDisplayOpen(!isDisplayOpen);
  };

  useEffect(() => {
    const checkWindow = setInterval(() => {
      setIsDisplayOpen(displayManager.isDisplayOpen());
    }, 1000);

    return () => {
      clearInterval(checkWindow);
      displayManager.closeDisplay();
    };
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Church Presentation System</h1>
        <Button onClick={toggleDisplay} variant={isDisplayOpen ? "outline" : "default"}>
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
              <SongList />
            </TabsContent>
            <TabsContent value="new">
              <SongForm />
            </TabsContent>
            <TabsContent value="queue">
              <ServiceQueue />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}