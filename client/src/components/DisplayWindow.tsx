import { useEffect, useState } from "react";

interface DisplayMessage {
  type: string;
  payload: any;
}

export default function DisplayWindow() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    function handleMessage(event: MessageEvent<DisplayMessage>) {
      console.log("Display window received message:", event.data);

      try {
        const { type, payload } = event.data;

        if (type === "DISPLAY_SEGMENT" && payload?.content) {
          console.log("Setting new content:", payload.content);
          setContent(payload.content);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }

    window.addEventListener("message", handleMessage);
    console.log("Display window ready to receive messages");

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        <p className="text-4xl font-bold leading-relaxed whitespace-pre-wrap">
          {content || "Ready to display"}
        </p>
      </div>
    </div>
  );
}