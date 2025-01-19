import { toast } from "@/hooks/use-toast";

interface DisplayMessage {
  type: 'DISPLAY_SEGMENT';
  payload: {
    content: string;
  };
}

class DisplayWindowManager {
  private displayWindow: Window | null = null;

  openDisplay(): Window | null {
    if (this.displayWindow?.closed) {
      this.displayWindow = null;
    }

    if (!this.displayWindow) {
      const newWindow = window.open('/display', 'presentation', 'width=800,height=600');
      if (!newWindow) {
        toast({
          title: "Could not open display window",
          description: "Please allow pop-ups for this site",
          variant: "destructive"
        });
        return null;
      }
      this.displayWindow = newWindow;
    }

    this.displayWindow.focus();
    return this.displayWindow;
  }

  sendMessage(message: DisplayMessage): boolean {
    if (!this.displayWindow || this.displayWindow.closed) {
      toast({
        title: "Display window not open",
        description: "Please open the display window first",
        variant: "destructive"
      });
      return false;
    }

    try {
      this.displayWindow.postMessage(message, '*');
      return true;
    } catch (error) {
      console.error('Failed to send message to display window:', error);
      toast({
        title: "Failed to display content",
        description: "There was an error communicating with the display window",
        variant: "destructive"
      });
      return false;
    }
  }

  displaySegment(content: string): boolean {
    return this.sendMessage({
      type: 'DISPLAY_SEGMENT',
      payload: { content }
    });
  }

  closeDisplay() {
    this.displayWindow?.close();
    this.displayWindow = null;
  }

  isDisplayOpen(): boolean {
    return !!(this.displayWindow && !this.displayWindow.closed);
  }
}

export const displayManager = new DisplayWindowManager();