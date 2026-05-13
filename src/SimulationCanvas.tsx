import React, { useRef, useEffect } from 'react';
import { GRID_SIZE, CELL_SIZE, DEPTH_COLORS, PHEROMONE_COLORS } from './constants';
import { CellType, AntType, AntState, ItemType, RoomType } from './types';

// Preload Images
const IMG_RAB = new Image(); IMG_RAB.src = '/rab.png';
const IMG_SOLD = new Image(); IMG_SOLD.src = '/sold.png';
const IMG_NYAN = new Image(); IMG_NYAN.src = '/nyan.png';
const IMG_KOROL = new Image(); IMG_KOROL.src = '/korol.png';
const IMG_ZUK = new Image(); IMG_ZUK.src = '/zuk.png';
const IMG_EDA = new Image(); IMG_EDA.src = '/eda.png';
const IMG_VODA = new Image(); IMG_VODA.src = '/voda.png';

interface Props {
  world: any;
  currentLevel: number;
  tick: number;
}

export const SimulationCanvas: React.FC<Props> = ({ world, currentLevel, tick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const levelData = world.levels[currentLevel];
    const grid = levelData.grid;
    const pheromones = levelData.pheromones;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid & Rooms
    const rooms = world.levels[currentLevel].rooms;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x;
        const cell = grid[idx];
        const room = rooms ? rooms[idx] : 0;
        
        if (cell === CellType.DIRT) {
          ctx.fillStyle = DEPTH_COLORS[currentLevel];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          
          // Noise/Pebble effect for dirt
          if ((x * 17 + y * 31) % 13 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, 2, 2);
          }
        } else if (cell === CellType.EMPTY) {
          // Room floor colors with specific palettes
          if (room === RoomType.STORAGE_FOOD) ctx.fillStyle = '#4d3d24'; // Brighter storage
          else if (room === RoomType.NURSERY) ctx.fillStyle = '#1e3a4d'; 
          else if (room === RoomType.QUEEN_CHAMBER) ctx.fillStyle = '#3a1e4d'; 
          else if (room === RoomType.SOLDIER_BARRACKS) ctx.fillStyle = '#4d241e';
          else if (room === RoomType.STORAGE_WATER) ctx.fillStyle = '#1e284d';
          else if (room === RoomType.CATERPILLAR_FARM) ctx.fillStyle = '#284d1e';
          else ctx.fillStyle = '#1a1816'; 
          
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          
          // Pattern for rooms
          if (room !== RoomType.NONE) {
              ctx.fillStyle = 'rgba(255,255,255,0.1)';
              if ((x+y) % 4 === 0) ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, 1, 1);
          }
          
          // Terrain decoration on surface
          if (currentLevel === 0 && room === RoomType.NONE) {
              if ((x * 123 + y * 456) % 197 < 2) { // Grass
                  ctx.fillStyle = '#4a7c2c';
                  ctx.fillRect(x * CELL_SIZE + 3, y * CELL_SIZE, 1, 4);
              }
              if ((x * 321 + y * 654) % 211 < 1) { // Pebble
                  ctx.fillStyle = '#7a7a7a';
                  ctx.beginPath(); ctx.arc(x * CELL_SIZE + 4, y * CELL_SIZE + 4, 2, 0, Math.PI*2); ctx.fill();
              }
          }
        } else if (cell === CellType.FOOD) {
          if (IMG_EDA.complete) {
            ctx.drawImage(IMG_EDA, x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          } else {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2, CELL_SIZE/2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (cell === CellType.WATER) {
          if (IMG_VODA.complete) {
            ctx.drawImage(IMG_VODA, x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          } else {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        } else if (cell === CellType.ENTRANCE) {
            ctx.fillStyle = '#a3e635';
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        
        // Pheromones
        const homeP = pheromones.home[idx];
        if (homeP > 0.05) {
            ctx.fillStyle = `rgba(74, 222, 128, ${Math.min(homeP * 0.15, 0.3)})`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        const foodP = pheromones.food[idx];
        if (foodP > 0.05) {
            ctx.fillStyle = `rgba(251, 191, 36, ${Math.min(foodP * 0.25, 0.3)})`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        const fearP = pheromones.fear[idx];
        if (fearP > 0.05) {
            ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(fearP * 0.3, 0.3)})`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw Ants
    world.ants.forEach((ant: any) => {
      if (ant.level !== currentLevel) return;

      ctx.save();
      ctx.translate(ant.pos.x * CELL_SIZE, ant.pos.y * CELL_SIZE);
      ctx.rotate(ant.angle + Math.PI / 2); // Rotate +90deg assuming sprites face UP

      if (ant.type === AntType.QUEEN) {
        if (IMG_KOROL.complete) {
          ctx.drawImage(IMG_KOROL, -14, -20, 28, 40);
        } else {
          ctx.fillStyle = '#a3e635'; 
          const bodyLen = 14;
          const bodyWid = 8;
          ctx.beginPath();
          ctx.ellipse(-bodyLen/4, 0, bodyLen/2, bodyWid/2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(bodyLen/4, 0, bodyLen/4, bodyWid/3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(bodyLen/2, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        let img = ant.type === AntType.SOLDIER ? IMG_SOLD : 
                  ant.type === AntType.NURSE ? IMG_NYAN : IMG_RAB;
        
        if (img.complete) {
            const size = ant.type === AntType.SOLDIER ? 20 : 16;
            ctx.drawImage(img, -size/2, -size/2, size, size);
        } else {
            const color = ant.type === AntType.SOLDIER ? '#ef4444' : 
                          ant.type === AntType.NURSE ? '#60a5fa' : '#d4d4c8';
            ctx.fillStyle = color;
            
            const size = ant.type === AntType.SOLDIER ? 6 : 4;
            ctx.beginPath();
            ctx.arc(size/2, 0, size/4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-size/2, -size/4, size, size/2);
            
            if (ant.type === AntType.SOLDIER) {
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(3, -2); ctx.lineTo(6, -4);
                ctx.moveTo(3, 2); ctx.lineTo(6, 4);
                ctx.stroke();
            }
        }
      }
      
      // Carried Item
      ctx.rotate(-Math.PI / 2); // Rotate back to true angle to draw carried items at head
      
      if (ant.inventory.type === ItemType.DIRT) {
          ctx.fillStyle = '#3d2f24';
          ctx.beginPath();
          ctx.arc(8, 0, 3, 0, Math.PI * 2);
          ctx.fill();
      } else if (ant.inventory.type === ItemType.FOOD) {
          if (IMG_EDA.complete) {
              ctx.drawImage(IMG_EDA, 5, -3, 6, 6);
          } else {
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.arc(6, 0, 2.5, 0, Math.PI * 2);
              ctx.fill();
          }
      }

      ctx.restore();
    });

    // Отрисовка личинок
    if (world.larvae) {
        world.larvae.filter((l: any) => l.level === currentLevel).forEach((l: any) => {
            ctx.fillStyle = '#f3f4f6';
            ctx.beginPath();
            ctx.ellipse(l.pos.x * CELL_SIZE, l.pos.y * CELL_SIZE, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Enemies
    if (world.enemies) {
        world.enemies.filter((e: any) => e.level === currentLevel).forEach((e: any) => {
            ctx.save();
            ctx.translate(e.pos.x * CELL_SIZE, e.pos.y * CELL_SIZE);
            ctx.rotate((e.angle || 0) + Math.PI / 2);
            if (IMG_ZUK.complete) {
                ctx.drawImage(IMG_ZUK, -14, -14, 28, 28);
            } else {
                ctx.fillStyle = '#422006'; // Much darker beetle
                if (e.type === 'BEETLE') {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Mandibles
                    ctx.strokeStyle = '#221103';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(8, -4); ctx.quadraticCurveTo(12, -8, 10, -12); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(12, 8, 10, 12); ctx.stroke();
                    // Legs
                    ctx.lineWidth = 1.5;
                    for(let i=0; i<3; i++) {
                        ctx.beginPath(); ctx.moveTo(-4, -6+i*6); ctx.lineTo(-12, -12+i*12); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(4, -6+i*6); ctx.lineTo(12, -12+i*12); ctx.stroke();
                    }
                }
            }
            ctx.restore();
        });
    }

    // Подписи уровней (Russian Context)
    ctx.fillStyle = 'rgba(163, 230, 53, 0.4)';
    ctx.font = '12px monospace';
    const statusText = currentLevel === 0 ? 'ПОВЕРХНОСТЬ' : 
                       currentLevel === 1 ? 'УРОВЕНЬ 1: СКЛАДЫ' :
                       currentLevel === 2 ? 'УРОВЕНЬ 2: КАМЕРА КОРОЛЕВЫ' :
                       `ПОДЗЕМЕЛЬЕ: ГЛУБИНА ${currentLevel}`;
    ctx.fillText(statusText, 10, GRID_SIZE * CELL_SIZE - 10);

  }, [world, currentLevel, tick]);

  return (
    <div className="relative border-4 border-[#3d2b1f] rounded-lg overflow-hidden shadow-2xl bg-[#151619]">
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        className="block cursor-crosshair"
      />
    </div>
  );
};
