
export const GRID_SIZE = 120; // 120x120 cells per level
export const CELL_SIZE = 8;   // pixels
export const PHEROMONE_EVAPORATION = 0.9995; // Much slower evaporation
export const PHEROMONE_STRENGTH = 1.0;
export const MAX_LEVELS = 10;
export const ANT_SPEED = 1.8;
export const ANT_ROTATION_SPEED = 0.25;
export const SENSOR_DISTANCE = 20;
export const SENSOR_ANGLE = Math.PI / 4;

export const DEPTH_COLORS = [
  '#3d2f24', // Level 0: Surface (Soil Light)
  '#362a20',
  '#30251c',
  '#2b2118', // Level 3: Mid (Soil Dark)
  '#251c14',
  '#201811',
  '#1a1512', // Level 6: Deep (Earth)
  '#15110e',
  '#100d0a',
  '#0a0806', // Level 9: Deepest
];

export const PHEROMONE_COLORS = {
  home: 'rgba(74, 222, 128, 0.4)',  // Lime 400ish
  food: 'rgba(251, 191, 36, 0.4)',   // Amber 400ish
  fear: 'rgba(239, 68, 68, 0.4)',    // Red 500ish
};
