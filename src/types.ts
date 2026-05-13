
export enum AntType {
  WORKER = 'WORKER',
  SOLDIER = 'SOLDIER',
  NURSE = 'NURSE',
  QUEEN = 'QUEEN'
}

export enum AntState {
  IDLE = 'IDLE',
  WANDERING = 'WANDERING',
  FORAGING = 'FORAGING',
  RETURNING_HOME = 'RETURNING_HOME',
  DIGGING = 'DIGGING',
  CARRYING_DIRT = 'CARRYING_DIRT',
  CARRYING_FOOD = 'CARRYING_FOOD',
  DEFENDING = 'DEFENDING',
  NURSING = 'NURSING',
  EATING = 'EATING',
  DRINKING = 'DRINKING',
  ATTACKING = 'ATTACKING'
}

export enum CellType {
  EMPTY = 0,
  DIRT = 1,
  OBSTACLE = 2,
  FOOD = 3,
  WATER = 4,
  ENTRANCE = 5
}

export enum RoomType {
  NONE = 0,
  STORAGE_FOOD = 1,
  STORAGE_WATER = 2,
  NURSERY = 3,
  SOLDIER_BARRACKS = 4,
  QUEEN_CHAMBER = 5,
  CATERPILLAR_FARM = 6
}

export enum EnemyState {
  WANDERING = 'WANDERING',
  CHASING = 'CHASING',
  ATTACKING = 'ATTACKING'
}

export enum ItemType {
  NONE = 'NONE',
  DIRT = 'DIRT',
  FOOD = 'FOOD',
  WATER = 'WATER',
  LARVA = 'LARVA',
  EGG = 'EGG'
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Ant {
  id: string;
  type: AntType;
  state: AntState;
  pos: Vector2D;
  angle: number; 
  health: number;
  hunger: number;
  thirst: number;
  inventory: {
    type: ItemType;
    amount: number;
  };
  level: number; 
  targetPos?: Vector2D;
  fearLevel: number;
}

export interface Larva {
  id: string;
  pos: Vector2D;
  level: number;
  age: number;
  fed: number; // 0-100
  type: AntType;
}

export interface WorldCell {
  type: CellType;
  roomType: RoomType;
  hp: number;
}

export interface PheromoneMap {
  home: Float32Array; 
  food: Float32Array; 
  fear: Float32Array; 
}

export interface Enemy {
  id: string;
  pos: Vector2D;
  level: number;
  health: number;
  type: 'SPIDER' | 'CENTIPEDE' | 'BEETLE';
  state: EnemyState;
  targetAntId?: string;
}

export interface GameState {
  currentLevel: number;
  levels: {
    [level: number]: {
      grid: Int8Array; 
      rooms: Int8Array;
      pheromones: PheromoneMap;
    }
  };
  ants: Ant[];
  larvae: Larva[];
  enemies: Enemy[];
  resources: {
    food: number;
    water: number;
    dirtMound: number; 
  };
  time: number;
}
