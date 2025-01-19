interface DisplayMessage {
  type: string;
  payload: any;
}

export function synchronizeDisplay(window: Window, message: DisplayMessage) {
  console.log("Sending message to display window:", message);
  if (!window || window.closed) {
    console.error("Display window is not available");
    return;
  }

  try {
    window.postMessage(message, "*");
    console.log("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}