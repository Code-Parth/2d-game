"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  LiveblocksProvider, 
  RoomProvider, 
  useRoom, 
  useOthers 
} from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { JsonObject } from "@liveblocks/client";

interface Player {
  name: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: "front" | "back" | "left" | "right";
}

function CanvasGame({ initialUsername }: { initialUsername: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());

  const room = useRoom();
  const others = useOthers();

  const [player, setPlayer] = useState<Player>({
    name: initialUsername,
    x: 50,
    y: 50,
    size: 64,
    speed: 5,
    direction: "front",
  });

  const spriteSheetUrl = "/sprites/sprite_sheet_64x64_colored.png";

  const updatePlayerPosition = useCallback(() => {
    setPlayer((prevPlayer) => {
      let { x, y, direction } = prevPlayer;
      const speed = prevPlayer.speed;

      if (keysPressedRef.current.has("ArrowUp")) {
        y = Math.max(0, y - speed);
        direction = "back";
      }
      if (keysPressedRef.current.has("ArrowDown")) {
        y = Math.min(window.innerHeight - prevPlayer.size, y + speed);
        direction = "front";
      }
      if (keysPressedRef.current.has("ArrowLeft")) {
        x = Math.max(0, x - speed);
        direction = "left";
      }
      if (keysPressedRef.current.has("ArrowRight")) {
        x = Math.min(window.innerWidth - prevPlayer.size, x + speed);
        direction = "right";
      }

      // Update room presence only if position changed
      if (x !== prevPlayer.x || y !== prevPlayer.y || direction !== prevPlayer.direction) {
        room.updatePresence({
          x: x,
          y: y,
          direction: direction,
          name: prevPlayer.name
        });
      }

      return { ...prevPlayer, x, y, direction };
    });
  }, [room]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      keysPressedRef.current.add(event.key);
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressedRef.current.delete(event.key);
  }, []);

  useEffect(() => {
    const gameLoop = () => {
      updatePlayerPosition();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Start the game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      // Clean up
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, updatePlayerPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    const spriteSheet = new Image();
    spriteSheet.src = spriteSheetUrl;
    spriteSheetRef.current = spriteSheet;

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    spriteSheet.onload = () => {
      const draw = () => {
        if (!context || !spriteSheetRef.current || !canvas) return;

        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        context.fillStyle = "lightblue";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const frameSize = 64;
        const directionMap: Record<string, number> = {
          back: 0,
          front: 1,
          left: 2,
          right: 3,
        };

        const drawPlayer = (playerData: { x: number, y: number, direction: string, name: string }) => {
          const row = directionMap[playerData.direction];

          context.drawImage(
            spriteSheetRef.current!,
            0,
            row * frameSize,
            frameSize,
            frameSize,
            playerData.x,
            playerData.y,
            player.size,
            player.size
          );

          // Draw player name above the sprite
          if (playerData.name) {
            context.font = "16px Arial";
            context.fillStyle = "black";
            context.textAlign = "center";
            context.fillText(
              playerData.name,
              playerData.x + player.size / 2,
              playerData.y - 10
            );
          }
        };

        // Draw local player
        drawPlayer({
          x: player.x,
          y: player.y,
          direction: player.direction,
          name: player.name
        });

        // Draw other players
        others.forEach((other) => {
          if (other.presence) {
            drawPlayer({
              x: typeof other.presence.x === 'number' ? other.presence.x : 50,
              y: typeof other.presence.y === 'number' ? other.presence.y : 50,
              direction: typeof other.presence.direction === 'string' ? other.presence.direction : "front",
              name: typeof other.presence.name === 'string' ? other.presence.name : "Player"
            });
          }
        });
      };

      draw();
    };

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [player, others]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block" }}
    ></canvas>
  );
}

export default function Home() {
  const [roomKey, setRoomKey] = useState("apexia");
  const [username, setUsername] = useState("");
  const [isRoomJoined, setIsRoomJoined] = useState(false);

  const handleJoinRoom = () => {
    if (username.trim()) {
      setIsRoomJoined(true);
    }
  };

  if (!isRoomJoined) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 h-screen"
      >
        <h1>Join Multiplayer Room</h1>
        <input
          type="text"
          placeholder="Your Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Room Key"
          value={roomKey}
          onChange={(e) => setRoomKey(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
        <button
          onClick={handleJoinRoom}
          disabled={!username.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Join Room
        </button>
      </div>
    );
  }

  return (
    <LiveblocksProvider 
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
    >
      <RoomProvider 
        id={roomKey}
        initialPresence={{
          x: 50,
          y: 50,
          direction: "front",
          name: username
        } as JsonObject}
      >
        <ClientSideSuspense fallback={<div>Loading...</div>}>
          {() => <CanvasGame initialUsername={username} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}