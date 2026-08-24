import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { connect } from '@ossido-labs/ossido/ws';
import type { OssidoSocket } from '@ossido-labs/ossido/ws';

interface ChatLine {
  from: number;
  text: string;
}

export default function ChatPage(): JSX.Element {
  const [lines, setLines] = useState<Array<ChatLine>>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<OssidoSocket | null>(null);

  useEffect(() => {
    // Connects to the `#[ossido::ws]` handler in src/ws.rs. Both event maps
    // are typed from the generated `.ossido/types.ts`.
    const socket = connect();
    socketRef.current = socket;

    const unsubscribe = socket.on((event) => {
      if (event.event === 'message') {
        setLines((current) => [...current, event.data]);
      }
    });

    return () => {
      unsubscribe();
      socket.close();
    };
  }, []);

  const onSend = (): void => {
    if (!text.trim()) return;
    socketRef.current?.send({ event: 'chat_message', data: { text } });
    setText('');
  };

  return (
    <>
      <title>Chat — with-websockets</title>
      <section>
        <h1>Chat</h1>
        <p>Open this page in a second tab to chat between the two.</p>
        <ul>
          {lines.map((line, index) => (
            <li key={index}>
              <strong>#{line.from}</strong> {line.text}
            </li>
          ))}
        </ul>
        <div>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSend()}
            placeholder="Say something"
          />
          <button type="button" onClick={onSend}>
            Send
          </button>
        </div>
      </section>
    </>
  );
}
