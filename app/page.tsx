"use client";

import { useEffect, useRef, useState } from "react";

interface Player {
  x: number;
  y: number;
  size: number; // Size of the player on the canvas
  speed: number;
  direction: "front" | "back" | "left" | "right"; // Direction of movement
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [player, setPlayer] = useState<Player>({
    x: 50,
    y: 50,
    size: 64, // Render player as a 64x64 sprite
    speed: 5,
    direction: "front", // Default direction
  });

  const spriteSheetUrl = "/sprites/sprite_sheet_64x64_colored.png"; // Path to the sprite sheet

  const handleKeyDown = (event: KeyboardEvent) => {
    setPlayer((prevPlayer) => {
      let { x, y, direction } = prevPlayer;
      const speed = prevPlayer.speed;

      switch (event.key) {
        case "ArrowUp":
          y = Math.max(0, y - speed);
          direction = "back";
          break;
        case "ArrowDown":
          y = Math.min(480 - prevPlayer.size, y + speed); // Stay within canvas
          direction = "front";
          break;
        case "ArrowLeft":
          x = Math.max(0, x - speed);
          direction = "left";
          break;
        case "ArrowRight":
          x = Math.min(640 - prevPlayer.size, x + speed); // Stay within canvas
          direction = "right";
          break;
      }

      return { ...prevPlayer, x, y, direction };
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!context) return;

    const spriteSheet = new Image();
    spriteSheet.src = spriteSheetUrl;

    const draw = () => {
      if (canvas) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw background
      context.fillStyle = "lightblue";
      context.fillRect(0, 0, 640, 480);

      // Draw player sprite
      const frameSize = 64; // Each frame is 64x64
      const directionMap: Record<string, number> = {
        back: 0,
        front: 1,
        left: 2,
        right: 3,
      };

      const row = directionMap[player.direction]; // Get the correct row based on direction

      spriteSheet.onload = () => {
        context.drawImage(
          spriteSheet,
          0, // X-offset for the first column
          row * frameSize, // Calculate Y-offset based on the row
          frameSize,
          frameSize,
          player.x,
          player.y,
          player.size,
          player.size
        );
      };
    };

    draw();
  }, [player]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div>
      <h1>2D Game with Minecraft-Inspired Skin</h1>
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ border: "1px solid black" }}
      ></canvas>
    </div>
  );
}
