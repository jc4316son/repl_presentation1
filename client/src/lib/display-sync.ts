import { toast } from "@/hooks/use-toast";

class DisplayManager {
  private static instance: DisplayManager;
  private displayWindow: Window | null = null;

  private constructor() {}

  static getInstance(): DisplayManager {
    if (!DisplayManager.instance) {
      DisplayManager.instance = new DisplayManager();
    }
    return DisplayManager.instance;
  }

  openDisplay(): void {
    try {
      // Close existing window if it's already open but not accessible
      if (this.displayWindow && !this.canAccessWindow()) {
        this.displayWindow = null;
      }

      // Create new window if needed
      if (!this.displayWindow) {
        this.displayWindow = window.open('/display', '_blank', 'width=800,height=600');

        if (!this.displayWindow) {
          toast({
            title: "Could not open display window",
            description: "Please allow pop-ups for this site",
            variant: "destructive"
          });
          return;
        }
      }

      this.displayWindow.focus();
    } catch (error) {
      console.error('Error opening display window:', error);
      toast({
        title: "Error opening display",
        description: "There was an error opening the display window",
        variant: "destructive"
      });
    }
  }

  closeDisplay(): void {
    if (this.canAccessWindow()) {
      this.displayWindow?.close();
    }
    this.displayWindow = null;
  }

  displayContent(content: string): void {
    if (!this.canAccessWindow()) {
      toast({
        title: "Display window not open",
        description: "Please open the display window first",
        variant: "destructive"
      });
      return;
    }

    try {
      this.displayWindow?.postMessage({ type: 'UPDATE_DISPLAY', content }, '*');
    } catch (error) {
      console.error('Error sending content to display:', error);
      toast({
        title: "Display Error",
        description: "Failed to send content to display window",
        variant: "destructive"
      });
    }
  }

  isDisplayOpen(): boolean {
    return this.canAccessWindow();
  }

  private canAccessWindow(): boolean {
    try {
      return !!(this.displayWindow && !this.displayWindow.closed);
    } catch {
      return false;
    }
  }
}

export const displayManager = DisplayManager.getInstance();