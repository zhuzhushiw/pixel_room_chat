export type Direction = 'down' | 'left' | 'right' | 'up';

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  color: string;
  avatar: string;
  isMoving: boolean;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  name: string;
  text: string;
  createdAt: number;
};

export type JoinPayload = {
  name: string;
  roomId: string;
  color: string;
  avatar: string;
};

export type RoomState = {
  selfId: string;
  roomId: string;
  players: Record<string, PlayerState>;
  messages: ChatMessage[];
};

export type MovePayload = {
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
};
