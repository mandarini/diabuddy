import { useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const MCP_URL = `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')}/functions/v1/mcp`;
const CLAUDE_CODE_COMMAND = `claude mcp add diabuddy -s user -t http ${MCP_URL}`;

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard unavailable:', err);
    }
  };

  return (
    <div>
      <p className="text-xs font-medium text-stone-500 mb-1">{label}</p>
      <div className="flex items-start gap-2">
        <code className="flex-1 block text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 break-all select-all">
          {value}
        </code>
        <Button
          variant="secondary"
          size="sm"
          onClick={copy}
          className="flex items-center gap-1 shrink-0"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

// The MCP server runs as whoever approved the client, so the assistant sees exactly the rows this
// account sees in the app.
export function ConnectAssistantCard() {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
        <Bot size={16} className="text-teal-600" /> Connect an AI assistant
      </h3>
      <p className="text-sm text-stone-500">
        DiaBuddy has an MCP server, so Claude can answer questions about your meals and readings.
        The assistant sees only your data, and only after you approve it.
      </p>
      <CopyField label="Claude Code" value={CLAUDE_CODE_COMMAND} />
      <CopyField label="Server URL for Claude Desktop, Cursor, or ChatGPT (custom connector)" value={MCP_URL} />
      <ol className="text-sm text-stone-500 list-decimal pl-5 space-y-1">
        <li>Run the command, or add the URL as a custom connector in your assistant.</li>
        <li>
          In Claude Code, run <code className="text-xs bg-stone-100 rounded px-1">/mcp</code>, pick{' '}
          <strong>diabuddy</strong>, and choose authenticate.
        </li>
        <li>
          Your browser opens the DiaBuddy consent page. Sign in and press <strong>Approve</strong>.
        </li>
      </ol>
      <p className="text-xs text-stone-400">
        Try “What were my 1-hour readings this week?” or “Draft the summary for my next appointment.”
      </p>
    </Card>
  );
}
