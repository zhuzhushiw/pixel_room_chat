import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { AVATAR_OPTIONS } from './avatarOptions';
import { GameCanvas } from './game/GameCanvas';
import type { ChatMessage, JoinPayload, MovePayload, PlayerState, RoomState } from './types';
import './styles.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
const COLORS = ['#ef476f', '#f78c3d', '#ffd166', '#06d6a0', '#3a86ff', '#8e7dff'];

type ConnectionState = 'idle' | 'connecting' | 'connected';

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('lobby');
  const [avatar, setAvatar] = useState<(typeof AVATAR_OPTIONS)[number]['id']>('alice');
  const [chatText, setChatText] = useState('');
  const [selfId, setSelfId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const color = useMemo(() => {
    if (!name.trim()) {
      return COLORS[0];
    }

    const code = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return COLORS[code % COLORS.length];
  }, [name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (connectionState === 'connecting' || !name.trim() || !roomId.trim()) {
      return;
    }

    socketRef.current?.disconnect();

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;
    setConnectionState('connecting');

    socket.on('connect', () => {
      const payload: JoinPayload = {
        name: name.trim(),
        roomId: roomId.trim().toLowerCase(),
        color,
        avatar,
      };
      socket.emit('join_room', payload);
    });

    socket.on('room_state', (state: RoomState) => {
      setSelfId(state.selfId);
      setPlayers(state.players);
      setMessages(state.messages);
      setConnectionState('connected');
    });

    socket.on('player_snapshot', (snapshot: Record<string, PlayerState>) => {
      setPlayers(snapshot);
    });

    socket.on('chat_message', (message: ChatMessage) => {
      setMessages((current) => [...current.slice(-39), message]);
      setLatestMessage(message);
    });

    socket.on('disconnect', () => {
      setConnectionState('idle');
      setSelfId(null);
      setPlayers({});
    });
  };

  const handleMove = (payload: MovePayload) => {
    socketRef.current?.emit('player_move', payload);
  };

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!text) {
      return;
    }

    socketRef.current?.emit('chat_send', { text });
    setChatText('');
  };

  const onlineCount = Object.keys(players).length;

  return (
    <main className="app">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Inspired by Microverse aesthetics</p>
          <h1>Pixel Room Chat</h1>
          <p className="lead">
            一个网页像素聊天室。你和朋友通过浏览器进入同一房间，每个人都有一个可移动的小人。
          </p>
        </div>
        <div className="status-card">
          <span className={`status-dot status-${connectionState}`} />
          <span>{connectionState === 'connected' ? `已连接 ${roomId}` : '等待加入房间'}</span>
          <strong>{onlineCount} online</strong>
        </div>
      </section>

      <section className="layout">
        <div className="stage-panel">
          <div className="stage-header">
            <span>WASD / 方向键移动</span>
            <span>Microverse 风格角色 + 办公室房间</span>
          </div>
          <GameCanvas selfId={selfId} players={players} latestMessage={latestMessage} onMove={handleMove} />
        </div>

        <aside className="sidebar">
          <form className="card join-card" onSubmit={handleJoin}>
            <h2>加入房间</h2>
            <label>
              昵称
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如 Ygzz1" />
            </label>
            <label>
              房间号
              <input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="lobby" />
            </label>
            <label>
              角色
              <div className="avatar-picker">
                {AVATAR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`avatar-choice${avatar === option.id ? ' avatar-choice-active' : ''}`}
                    onClick={() => setAvatar(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </label>
            <label>
              点缀色
              <div className="color-chip">
                <span style={{ backgroundColor: color }} />
                <code>{color}</code>
              </div>
            </label>
            <button type="submit" disabled={connectionState === 'connecting'}>
              {connectionState === 'connected' ? '已在房间中' : connectionState === 'connecting' ? '连接中...' : '进入房间'}
            </button>
          </form>

          <section className="card roster-card">
            <h2>在线角色</h2>
            <div className="roster">
              {Object.values(players).map((player) => (
                <div key={player.id} className="roster-item">
                  <span className="roster-color" style={{ backgroundColor: player.color }} />
                  <div>
                    <strong>{player.name}</strong>
                    <p>{AVATAR_OPTIONS.find((option) => option.id === player.avatar)?.label ?? player.avatar}</p>
                    <p>
                      {Math.round(player.x)}, {Math.round(player.y)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card chat-card">
            <h2>聊天室</h2>
            <div className="chat-log">
              {messages.map((message) => (
                <article key={message.id} className="chat-row">
                  <header>
                    <strong>{message.name}</strong>
                    <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </header>
                  <p>{message.text}</p>
                </article>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-form" onSubmit={handleSend}>
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder="说点什么..."
                disabled={connectionState !== 'connected'}
              />
              <button type="submit" disabled={connectionState !== 'connected'}>
                发送
              </button>
            </form>
          </section>
        </aside>
      </section>
    </main>
  );
}
