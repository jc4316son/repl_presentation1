import { useEffect, useState } from "react";

interface DisplayMessage {
  type: 'UPDATE_DISPLAY';
  content: string;
}

export default function DisplayWindow() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      console.log('Received message:', event.data); // Debug log
      const data = event.data as DisplayMessage;

      if (data?.type === 'UPDATE_DISPLAY' && typeof data.content === 'string') {
        console.log('Updating content to:', data.content); // Debug log
        setContent(data.content);
      }
    }

    window.addEventListener('message', handleMessage);

    // Notify parent window that display is ready
    if (window.opener) {
      console.log('Notifying parent window that display is ready'); // Debug log
      window.opener.postMessage({ type: 'DISPLAY_READY' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
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