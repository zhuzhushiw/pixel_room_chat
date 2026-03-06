import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PixelScene } from './PixelScene';
import type { ChatMessage, Direction, PlayerState } from '../types';

type Props = {
  selfId: string | null;
  players: Record<string, PlayerState>;
  latestMessage: ChatMessage | null;
  onMove: (payload: { x: number; y: number; direction: Direction; isMoving: boolean }) => void;
};

export function GameCanvas({ selfId, players, latestMessage, onMove }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<PixelScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return;
    }

    const scene = new PixelScene({
      onMove: (payload) => {
        onMoveRef.current(payload);
      },
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 1152,
      height: 768,
      backgroundColor: '#111827',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    if (selfId) {
      scene.setLocalPlayer(selfId);
    }

    scene.syncPlayers(players);
  }, [players, selfId]);

  useEffect(() => {
    if (!latestMessage) {
      return;
    }

    sceneRef.current?.showMessage(latestMessage);
  }, [latestMessage]);

  return <div className="game-shell" ref={hostRef} />;
}
