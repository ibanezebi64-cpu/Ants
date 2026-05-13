import { useState, useEffect, useRef, useCallback } from 'react';
import { Ant, AntState, AntType, CellType, Vector2D, ItemType, RoomType } from './types';
import { ANT_SPEED, ANT_ROTATION_SPEED, SENSOR_ANGLE, SENSOR_DISTANCE, GRID_SIZE, PHEROMONE_EVAPORATION, CELL_SIZE, MAX_LEVELS } from './constants';

export function useSimulation() {
  const [level, setLevel] = useState(0);
  const isPausedRef = useRef(false);
  const [isPaused, setIsPausedState] = useState(false);
  const [tick, setTick] = useState(0);
  const worldRef = useRef<any>(null);

  const setIsPaused = useCallback((val: boolean) => {
    isPausedRef.current = val;
    setIsPausedState(val);
  }, []);
  const requestRef = useRef<number>(null);

  const navigate = (ant: Ant, attract: Float32Array, repel: Float32Array, grid: Int8Array): number => {
    const sense = (offsetAngle: number) => {
        const angle = ant.angle + offsetAngle;
        const sx = Math.floor(ant.pos.x + Math.cos(angle) * (SENSOR_DISTANCE / CELL_SIZE));
        const sy = Math.floor(ant.pos.y + Math.sin(angle) * (SENSOR_DISTANCE / CELL_SIZE));
        if (sx < 0 || sx >= GRID_SIZE || sy < 0 || sy >= GRID_SIZE) return -1;
        const idx = sy * GRID_SIZE + sx;
        if (grid[idx] === CellType.OBSTACLE || (grid[idx] === CellType.DIRT && (ant.level === 0 || ant.type !== AntType.WORKER))) return -1;
        return attract[idx] - (repel[idx] * 0.5) + (Math.random() * 0.05);
    };

    const left = sense(-SENSOR_ANGLE);
    const center = sense(0);
    const right = sense(SENSOR_ANGLE);

    if (center >= left && center >= right) return ant.angle;
    if (left > right) return ant.angle - ANT_ROTATION_SPEED;
    return ant.angle + ANT_ROTATION_SPEED;
  };

    // Initialize world state
    if (!worldRef.current) {
        const levels: any = {};
        for (let l = 0; l < MAX_LEVELS; l++) {
          const grid = new Int8Array(GRID_SIZE * GRID_SIZE);
          const rooms = new Int8Array(GRID_SIZE * GRID_SIZE); 
          
          if (l === 0) {
            grid.fill(CellType.EMPTY);
            for (let i = 0; i < grid.length; i++) {
                if (Math.random() < 0.05) grid[i] = CellType.OBSTACLE;
                else if (Math.random() < 0.01) grid[i] = CellType.FOOD;
            }
            const centerIdx = Math.floor(GRID_SIZE/2) * GRID_SIZE + Math.floor(GRID_SIZE/2);
            grid[centerIdx] = CellType.ENTRANCE;
          } else {
            grid.fill(CellType.DIRT);
            // Starting shaft
            const cx = Math.floor(GRID_SIZE/2);
            const cy = Math.floor(GRID_SIZE/2);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    grid[(cy + dy) * GRID_SIZE + (cx + dx)] = CellType.EMPTY;
                }
            }
            // Define areas but don't dig them yet
            if (l === 1) { 
                markRoom(rooms, GRID_SIZE/2, GRID_SIZE/2 - 10, 6, RoomType.STORAGE_FOOD);
            }
            if (l === 2) { 
                markRoom(rooms, GRID_SIZE/2, GRID_SIZE/2 + 10, 8, RoomType.QUEEN_CHAMBER);
                markRoom(rooms, GRID_SIZE/2 + 15, GRID_SIZE/2, 7, RoomType.NURSERY);
            }
          }

          levels[l] = { grid, rooms, pheromones: { home: new Float32Array(GRID_SIZE**2), food: new Float32Array(GRID_SIZE**2), fear: new Float32Array(GRID_SIZE**2) }};
        }

        function markRoom(rooms: any, cx: number, cy: number, r: number, type: RoomType) {
            for(let dy=-r; dy<=r; dy++) for(let dx=-r; dx<=r; dx++) {
                if(dx*dx+dy*dy <= r*r) rooms[Math.floor(cy+dy)*GRID_SIZE + Math.floor(cx+dx)] = type;
            }
        }

        const initialAnts: Ant[] = [];
        for (let i = 0; i < 40; i++) {
            let type = AntType.WORKER;
            if (i === 0) type = AntType.QUEEN;
            else if (i < 8) type = AntType.NURSE;
            else if (i < 15) type = AntType.SOLDIER;
            initialAnts.push({
                id: Math.random().toString(36).substr(2, 9),
                type, pos: { x: GRID_SIZE/2 + (Math.random()-0.5)*5, y: GRID_SIZE/2 + (Math.random()-0.5)*5 },
                angle: Math.random()*Math.PI*2, health: 100, level: 0, inventory: { type: ItemType.NONE, amount: 0 }
            } as any);
        }

        worldRef.current = { levels, ants: initialAnts, larvae: [], enemies: [], resources: { food: 200, water: 100, dirtMound: 0 }, time: 0 };
    }

  const update = useCallback(() => {
    if (isPausedRef.current) return;
    const world = worldRef.current;
    if (!world) return;
    
    // 1. Evaporate Pheromones
    for (let l in world.levels) {
        const p = world.levels[l].pheromones;
        for (let i = 0; i < p.home.length; i++) {
            p.home[i] *= PHEROMONE_EVAPORATION;
            p.food[i] *= PHEROMONE_EVAPORATION;
            p.fear[i] *= PHEROMONE_EVAPORATION;
        }
    }

    // 2. Update Ants
    world.ants.forEach((ant: Ant) => {
        const levelData = world.levels[ant.level];
        const grid = levelData.grid;
        const phero = levelData.pheromones;
        const rooms = levelData.rooms;

        // --- QUEEN LOGIC: Special behavior ---
        if (ant.type === AntType.QUEEN) {
            const roomX = GRID_SIZE/2;
            const roomY = GRID_SIZE/2 + 10;
            const qTargetIdx = Math.floor(roomY) * GRID_SIZE + Math.floor(roomX);
            const targetDug = world.levels[2] && world.levels[2].grid[qTargetIdx] === CellType.EMPTY;

            const distCenter = Math.sqrt(Math.pow(ant.pos.x - GRID_SIZE/2, 2) + Math.pow(ant.pos.y - GRID_SIZE/2, 2));

            if (ant.level < 2) {
                // Instantly head down to level 2 because the shaft is already dug
                if (distCenter < 4) {
                    ant.level++;
                    ant.pos.x = GRID_SIZE/2 + (Math.random()-0.5)*2; ant.pos.y = GRID_SIZE/2 + (Math.random()-0.5)*2;
                    return;
                } else {
                    ant.angle = Math.atan2(GRID_SIZE/2 - ant.pos.y, GRID_SIZE/2 - ant.pos.x);
                }
            } else {
                // On level 2
                if (targetDug) {
                    const distRoom = Math.sqrt(Math.pow(ant.pos.x - roomX, 2) + Math.pow(ant.pos.y - roomY, 2));
                    if (distRoom > 3) {
                        ant.angle = Math.atan2(roomY - ant.pos.y, roomX - ant.pos.x);
                    } else {
                        ant.angle += (Math.random() - 0.5) * 0.1;
                    }
                } else {
                    // Waiting for room to be dug: stay close to the shaft center
                    if (distCenter > 3) {
                        ant.angle = Math.atan2(GRID_SIZE/2 - ant.pos.y, GRID_SIZE/2 - ant.pos.x);
                    } else {
                        ant.angle += (Math.random() - 0.5) * 0.2;
                    }
                }
            }

            if (world.resources.food > 50 && world.time % 1000 === 0 && world.ants.length < 50) {
                world.resources.food -= 10;
                world.larvae.push({
                   id: Math.random().toString(36).substr(2, 9),
                   pos: { x: ant.pos.x + (Math.random()-0.5)*5, y: ant.pos.y + (Math.random()-0.5)*5 },
                   level: ant.level, age: 0, fed: 40,
                   type: Math.random() < 0.6 ? AntType.WORKER : (Math.random() < 0.85 ? AntType.NURSE : AntType.SOLDIER)
                });
            }
            const qNextX = ant.pos.x + Math.cos(ant.angle) * 0.05;
            const qNextY = ant.pos.y + Math.sin(ant.angle) * 0.05;
            if (qNextX > 2 && qNextX < GRID_SIZE-2 && qNextY > 2 && qNextY < GRID_SIZE-2 && grid[Math.floor(qNextY)*GRID_SIZE + Math.floor(qNextX)] !== CellType.DIRT) {
                ant.pos.x = qNextX; ant.pos.y = qNextY;
            }
            return;
        }

        // --- BRAIN: TARGETING ---
        if (ant.inventory.type === ItemType.NONE) {
            if (ant.type === AntType.WORKER) {
                if (ant.level === 0) ant.angle = navigate(ant, phero.food, phero.home, grid);
                else {
                    const targetIdx = findDigTarget(levelData);
                    if (targetIdx !== -1) {
                        ant.angle = Math.atan2(Math.floor(targetIdx/GRID_SIZE) - ant.pos.y, (targetIdx%GRID_SIZE) - ant.pos.x);
                    } else ant.angle = navigate(ant, phero.home, phero.home, grid);
                }
            } else if (ant.type === AntType.SOLDIER) {
                const hasEnemy = (world.enemies || []).some((e: any) => e.level === ant.level);
                if (hasEnemy) ant.angle = navigate(ant, phero.fear, phero.home, grid);
                else {
                    const px = ant.level === 0 ? GRID_SIZE/2 : 15;
                    const py = ant.level === 0 ? GRID_SIZE/2 : 15;
                    ant.angle = Math.atan2(py - ant.pos.y, px - ant.pos.x) + (Math.random()-0.5)*0.2;
                }
            } else if (ant.type === AntType.NURSE) {
                if (ant.level === 2) {
                    const hungryLarva = world.larvae.find((l: any) => l.level === 2 && l.fed < 80);
                    if (hungryLarva) ant.angle = Math.atan2(hungryLarva.pos.y - ant.pos.y, hungryLarva.pos.x - ant.pos.x);
                    else ant.angle = Math.atan2(GRID_SIZE/2 - ant.pos.y, GRID_SIZE/2 - ant.pos.x);
                } else ant.angle = navigate(ant, phero.food, phero.home, grid);
            }
        } else {
            // Carrying an item
            if (ant.inventory.type === ItemType.FOOD && ant.level > 0) {
                // If carrying food and already in the nest, point towards the food storage room (level 1)
                const storageX = GRID_SIZE / 2;
                const storageY = GRID_SIZE / 2 - 10;
                ant.angle += (Math.atan2(storageY - ant.pos.y, storageX - ant.pos.x) - ant.angle) * 0.1;
            } else if (ant.inventory.type === ItemType.DIRT && ant.level === 0) {
                // Carrying dirt on surface: move away from entrance
                const angleAway = Math.atan2(ant.pos.y - GRID_SIZE/2, ant.pos.x - GRID_SIZE/2);
                ant.angle += (angleAway - ant.angle) * 0.1;
                // Add some randomness to spread the dirt
                ant.angle += (Math.random() - 0.5) * 0.5;
            } else {
                // Otherwise (carrying dirt on level > 0, or carrying food on level 0), go to the entrance
                ant.angle = Math.atan2(GRID_SIZE/2 - ant.pos.y, GRID_SIZE/2 - ant.pos.x);
            }
        }

        // --- MOVEMENT ---
        let speed = ANT_SPEED;
        if (ant.type === AntType.SOLDIER) speed *= 1.6;
        if (ant.inventory.type !== ItemType.NONE) speed *= 0.6;
        const nextX = ant.pos.x + Math.cos(ant.angle) * (speed / 10);
        const nextY = ant.pos.y + Math.sin(ant.angle) * (speed / 10);
        const nIdx = Math.floor(nextY) * GRID_SIZE + Math.floor(nextX);
        
        if (nIdx >= 0 && nIdx < grid.length) {
            if (grid[nIdx] === CellType.DIRT) {
                if (ant.type === AntType.WORKER && ant.inventory.type === ItemType.NONE && ant.level > 0) {
                    grid[nIdx] = CellType.EMPTY; ant.inventory = { type: ItemType.DIRT, amount: 1 }; ant.angle += Math.PI;
                } else ant.angle += (Math.random() - 0.5) * 2;
            } else if (grid[nIdx] === CellType.OBSTACLE) ant.angle += (Math.random() - 0.5) * 2;
            else { ant.pos.x = nextX; ant.pos.y = nextY; }
        }

        // --- TRANSITIONS & ACTIONS ---
        const dist = Math.sqrt(Math.pow(ant.pos.x - GRID_SIZE/2, 2) + Math.pow(ant.pos.y - GRID_SIZE/2, 2));
        if (dist < 3.5) {
            let changed = false;
            if (ant.inventory.type === ItemType.NONE) {
                if (ant.type === AntType.WORKER && Math.random() < 0.2) { ant.level = ant.level === 0 ? 1 : (ant.level === 1 ? (Math.random() < 0.5 ? 2 : 0) : 1); changed = true; }
                else if (ant.type === AntType.NURSE && Math.random() < 0.2) { ant.level = ant.level === 1 ? 2 : 1; changed = true; }
                else if (ant.type === AntType.SOLDIER && Math.random() < 0.2) { ant.level = (world.enemies?.length || 0) > 0 ? 0 : 1; changed = true; }
            } else if (ant.inventory.type === ItemType.DIRT && ant.level > 0) { ant.level--; changed = true; }
            else if (ant.inventory.type === ItemType.FOOD && ant.level === 0) { ant.level = 1; changed = true; }

            if (changed) {
                const escapeAngle = Math.random() * Math.PI * 2;
                ant.pos.x = GRID_SIZE/2 + Math.cos(escapeAngle) * 4.5;
                ant.pos.y = GRID_SIZE/2 + Math.sin(escapeAngle) * 4.5;
                ant.angle = escapeAngle; // Face outward so they walk away from the entrance
                return;
            }
        }

        const curIdx = Math.floor(ant.pos.y) * GRID_SIZE + Math.floor(ant.pos.x);
        if (ant.inventory.type === ItemType.NONE) {
            if (ant.level === 0 && grid[curIdx] === CellType.FOOD && ant.type === AntType.WORKER) { grid[curIdx] = CellType.EMPTY; ant.inventory = { type: ItemType.FOOD, amount: 1 }; ant.angle += Math.PI; }
            else if (ant.level === 1 && rooms[curIdx] === RoomType.STORAGE_FOOD && ant.type === AntType.NURSE && world.resources.food > 0) { world.resources.food--; ant.inventory = { type: ItemType.FOOD, amount: 1 }; ant.angle += Math.PI; }
        } else if (ant.inventory.type === ItemType.FOOD) {
            if (ant.level === 1 && rooms[curIdx] === RoomType.STORAGE_FOOD && ant.type === AntType.WORKER) { world.resources.food++; ant.inventory = { type: ItemType.NONE, amount: 0 }; ant.angle += Math.PI; }
            else if (ant.level === 2 && ant.type === AntType.NURSE) {
                const larva = world.larvae.find((l: any) => l.level === 2 && l.fed < 100 && Math.abs(l.pos.x - ant.pos.x) < 4);
                if (larva) { larva.fed += 30; ant.inventory = { type: ItemType.NONE, amount: 0 }; ant.angle += Math.PI; }
            }
        } else if (ant.inventory.type === ItemType.DIRT && ant.level === 0 && dist > 5) { 
            world.resources.dirtMound++; ant.inventory = { type: ItemType.NONE, amount: 0 }; ant.angle += Math.PI; 
        }

        phero[ant.inventory.type === ItemType.NONE ? 'home' : 'food'][curIdx] = 1.0;
    });

    function findDigTarget(lv: any) {
        for (let i = 0; i < lv.rooms.length; i++) {
           if (lv.rooms[i] !== RoomType.NONE && lv.grid[i] === CellType.DIRT) {
               if ([i-1, i+1, i-GRID_SIZE, i+GRID_SIZE].some(n => n >= 0 && n < lv.grid.length && lv.grid[n] === CellType.EMPTY)) return i;
           }
        }
        return -1;
    }

    // 2.3.1 Update Larvae
    world.larvae.forEach((l: any) => {
        l.age += 1; l.fed -= 0.05; if (l.fed < 0) l.dead = true;
        if (l.age > 4000) {
            world.ants.push({ id: Math.random().toString(36).substr(2, 9), type: l.type, pos: { ...l.pos }, angle: Math.random()*6, health: 100, level: l.level, inventory: { type: ItemType.NONE, amount: 0 } } as any);
            l.dead = true;
        }
    }); 
    world.larvae = world.larvae.filter((l: any) => !l.dead);

    // 2.7 Update Enemies
    if (!world.enemies) world.enemies = [];
    if (world.time % 1000 === 0 && Math.random() < 0.4 && (world.enemies?.length || 0) < 5) {
        let sx, sy;
        if (Math.random() > 0.5) {
            sx = Math.random() * GRID_SIZE;
            sy = Math.random() < 0.5 ? 5 : GRID_SIZE - 5;
        } else {
            sx = Math.random() < 0.5 ? 5 : GRID_SIZE - 5;
            sy = Math.random() * GRID_SIZE;
        }
        world.enemies.push({
            id: Math.random().toString(36).substr(2, 9),
            pos: { x: sx, y: sy },
            level: 0, health: 100, type: 'BEETLE',
            state: 'WANDERING'
        });
    }

    world.enemies = world.enemies.filter((e: any) => e.health > 0);
    world.enemies.forEach((enemy: any) => {
        const antsOnLevel = world.ants.filter((a: any) => a.level === enemy.level);
        let target = antsOnLevel.find((a: any) => {
            const d = Math.sqrt(Math.pow(a.pos.x-enemy.pos.x, 2) + Math.pow(a.pos.y-enemy.pos.y, 2));
            return d < 20; 
        });

        if (target) {
            enemy.state = 'CHASING';
            const dx = target.pos.x - enemy.pos.x;
            const dy = target.pos.y - enemy.pos.y;
            const mag = Math.sqrt(dx*dx + dy*dy);
            enemy.pos.x += (dx/mag) * 0.22;
            enemy.pos.y += (dy/mag) * 0.22;
            
            if (mag < 3) {
                const damage = target.type === AntType.SOLDIER ? 0.4 : 1.2;
                target.health -= damage;
                // Emit fear at bit location
                const bIdx = Math.floor(target.pos.y)*GRID_SIZE + Math.floor(target.pos.x);
                if (bIdx >= 0 && bIdx < GRID_SIZE*GRID_SIZE) world.levels[0].pheromones.fear[bIdx] = 1.0;
            }
        } else {
            enemy.state = 'WANDERING';
            if (!enemy.angle) enemy.angle = Math.random() * Math.PI * 2;
            enemy.angle += (Math.random() - 0.5) * 0.15;
            
            const dx = GRID_SIZE/2 - enemy.pos.x;
            const dy = GRID_SIZE/2 - enemy.pos.y;
            const distCenter = Math.sqrt(dx*dx + dy*dy);
            if (distCenter > 55) {
                 const angleCenter = Math.atan2(dy, dx);
                 enemy.angle += (angleCenter - enemy.angle) * 0.05;
            } else if (distCenter < 25) {
                // Flee from entrance if just wandering (prevents camping)
                const angleAway = Math.atan2(enemy.pos.y - GRID_SIZE/2, enemy.pos.x - GRID_SIZE/2);
                enemy.angle += (angleAway - enemy.angle) * 0.15;
            }

            enemy.pos.x += Math.cos(enemy.angle) * 0.12;
            enemy.pos.y += Math.sin(enemy.angle) * 0.12;
            
            if (enemy.pos.x < 2 || enemy.pos.x > GRID_SIZE-2 || enemy.pos.y < 2 || enemy.pos.y > GRID_SIZE-2) {
                enemy.angle += Math.PI;
            }
        }
        
        const exIdx = Math.floor(enemy.pos.y)*GRID_SIZE + Math.floor(enemy.pos.x);
        if (exIdx >= 0 && exIdx < GRID_SIZE*GRID_SIZE) {
            world.levels[enemy.level].pheromones.fear[exIdx] = Math.max(world.levels[enemy.level].pheromones.fear[exIdx], 0.6);
        }
    });

    world.ants = world.ants.filter((a: any) => a.health > 0);

    // 2.8 Caterpillar Farm Logic
    if (world.time % 3000 === 0) {
        for (let l = 1; l < MAX_LEVELS; l++) {
            const levelData = world.levels[l];
            const rooms = levelData.rooms;
            const grid = levelData.grid;
            // If food is near a caterpillar farm, it might double? Or just generate food
            for (let i = 0; i < rooms.length; i++) {
                if (rooms[i] === RoomType.CATERPILLAR_FARM && grid[i] === CellType.EMPTY && Math.random() < 0.05) {
                    grid[i] = CellType.FOOD;
                }
            }
        }
    }

    world.time += 1;
    // Force re-render every tick by updating the tick state
    // We do this outside the mutation to ensure React sees the change
    setTick(world.time);
  }, []); // Removed isPaused and level from dependencies to make it a stable loop

  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;
    
    const loop = (time: number) => {
      if (!isPausedRef.current) {
        // Run update at targeted ~60fps
        const delta = time - lastTime;
        if (delta > 16) {
          update();
          lastTime = time - (delta % 16);
        }
      }
      frameId = requestAnimationFrame(loop);
    };
    
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [update]);

  const addElement = useCallback((x: number, y: number, type: CellType) => {
    const world = worldRef.current;
    if (!world) return;
    const gridIdx = Math.floor(y) * GRID_SIZE + Math.floor(x);
    if (gridIdx >= 0 && gridIdx < world.levels[level].grid.length) {
        world.levels[level].grid[gridIdx] = type;
    }
  }, [level]);

  const addEnemy = useCallback((x: number, y: number) => {
    const world = worldRef.current;
    if (!world || !world.enemies) return;
    world.enemies.push({
        id: Math.random().toString(36).substr(2, 9),
        pos: { x, y },
        level: level,
        health: 100,
        type: 'BEETLE',
        state: 'WANDERING'
    });
  }, [level]);

  const resetSimulation = useCallback(() => {
    worldRef.current = null;
    setTick(0);
    // This will trigger the initialization block in the next render
  }, []);

  return {
    world: worldRef.current,
    level,
    setLevel,
    isPaused,
    setIsPaused,
    addElement,
    addEnemy,
    resetSimulation,
    tick
  };
}
