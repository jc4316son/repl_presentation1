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
  window.postMessage(message, "*");
}