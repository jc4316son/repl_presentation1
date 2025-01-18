interface DisplayMessage {
  type: string;
  payload: any;
}

export function synchronizeDisplay(window: Window, message: DisplayMessage) {
  window.postMessage(message, "*");
}
