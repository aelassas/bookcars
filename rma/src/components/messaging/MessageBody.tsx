import { Mic, Image as ImageIcon, Video, Paperclip } from "lucide-react";
import { parseChatBody, type ChatBodyKind } from "@/lib/chat-body";

const META: Record<Exclude<ChatBodyKind, "text">, { Icon: React.ElementType; label: string }> = {
  voice: { Icon: Mic, label: "Voice" },
  image: { Icon: ImageIcon, label: "Photo" },
  video: { Icon: Video, label: "Video" },
  file: { Icon: Paperclip, label: "Attachment" },
};

/**
 * Renders a WhatsApp message body: plain text as-is, media as a labelled chip
 * (🎤 Voice / 🖼️ Photo …) with its transcript/OCR text underneath — or a quiet
 * "no transcript" note when the media couldn't be read. No raw "[voice/audio]"
 * markers ever reach the screen.
 */
export function MessageBody({ body }: { body: string | null | undefined }) {
  const { kind, text } = parseChatBody(body);
  if (kind === "text") return <p className="whitespace-pre-wrap break-words">{text}</p>;

  const { Icon, label } = META[kind];
  return (
    <div>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide opacity-70">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      {text ? (
        <p className="mt-0.5 whitespace-pre-wrap break-words">{text}</p>
      ) : (
        <p className="mt-0.5 text-xs italic opacity-60">no transcript</p>
      )}
    </div>
  );
}
