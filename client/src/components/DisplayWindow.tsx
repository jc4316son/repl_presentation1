import { useEffect, useState } from "react";

interface DisplayMessage {
  type: 'DISPLAY_SEGMENT';
  payload: {
    content: string;
  };
}

export default function DisplayWindow() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data as DisplayMessage;

      if (message?.type === 'DISPLAY_SEGMENT' && message?.payload?.content) {
        setContent(message.payload.content);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
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