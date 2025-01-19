import { useEffect, useState } from "react";

interface DisplayMessage {
  type: string;
  payload: any;
}

export default function DisplayWindow() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("Received message:", event.data);
      const message: DisplayMessage = event.data;
      if (message.type === "DISPLAY_SEGMENT") {
        console.log("Setting content:", message.payload.content);
        setContent(message.payload.content);
      }
    };

    console.log("Setting up message listener");
    window.addEventListener("message", handleMessage);
    return () => {
      console.log("Removing message listener");
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