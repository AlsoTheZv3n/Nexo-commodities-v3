import { Bot, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import Card from "./Card";

export default function AgentCard({ text, loading, assetName }) {
  return (
    <Card
      label={`Claude Agent — ${assetName}`}
      trailing={text ? "claude-sonnet-4 · web_search" : ""}
      span={3}
    >
      <div className="bg-black/30 border border-border rounded-lg p-4 text-xs leading-[1.9] text-text-secondary min-h-[80px] max-h-80 overflow-y-auto">
        {loading ? (
          <span className="text-accent/70 flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" />
            Running analysis with web search...
          </span>
        ) : text ? (
          <div className="prose-agent">
            <Markdown>{text}</Markdown>
            <span className="animate-blink">▋</span>
          </div>
        ) : (
          <span className="text-muted flex items-center gap-2">
            <Bot size={14} />
            Run the agent for AI-powered analysis with Monte Carlo forecast, technical indicators, and live market context.
          </span>
        )}
      </div>
    </Card>
  );
}
