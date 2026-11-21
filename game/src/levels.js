// Gilded Shadow — the three museum floors. One job: the maps, the patrols and
// the tile rules. Every map is 26 columns by 15 rows; the legend is:
//   '#' wall   '.' floor   'C' crate (cover)   'D' display case (cover)
//   'A' artifact pedestal   'E' exit   'P' player start   'L' lamp (floor + light)
// A guard's waypoints are tile coordinates; it walks them in order, pausing at each.
import { COLS, ROWS } from './config.js';

export const TILE_WALL = '#';
export const TILE_FLOOR = '.';
export const TILE_CRATE = 'C';
export const TILE_CASE = 'D';
export const TILE_ARTIFACT = 'A';
export const TILE_EXIT = 'E';
export const TILE_START = 'P';
export const TILE_LAMP = 'L';

/** Tiles the player and the guards can stand on. */
export function isWalkable(tile) {
  return (
    tile === TILE_FLOOR ||
    tile === TILE_LAMP ||
    tile === TILE_ARTIFACT ||
    tile === TILE_EXIT ||
    tile === TILE_START
  );
}

/** Tiles that block a guard's line of sight (and movement). */
export function blocksSight(tile) {
  return tile === TILE_WALL || tile === TILE_CRATE || tile === TILE_CASE;
}

export const LEVELS = [
  {
    name: 'The Atrium',
    intro: 'One relic sleeps behind glass. Two guards walk the floor. Stay out of the light.',
    map: [
      '##########################',
      '#P....#...L..#......A....#',
      '#.....#..C...#..C........#',
      '#..C..#......#......C....#',
      '#.....D......D...........#',
      '#....L...................#',
      '#...####....####....##...#',
      '#...#.........#.....#....#',
      '#...#....C....#..C..#....#',
      '#...#.........#.....#....#',
      '#...####....####....##...#',
      '#.............L..........#',
      '#..C.....D......C....E...#',
      '#........................#',
      '##########################',
    ],
    guards: [
      { name: 'Mara', waypoints: [[22, 1], [22, 4]], pause: 1.6 },
      { name: 'Bram', waypoints: [[8, 11], [20, 11]], pause: 1.2 },
    ],
  },
  {
    name: 'The Vault Wing',
    intro: 'Two relics now, three guards, and the vault door watches the hall. Patience pays.',
    map: [
      '##########################',
      '#P.....#......#.....A....#',
      '#..C...#..L...#..C.......#',
      '#......D......D......C...#',
      '#..L.....................#',
      '#....######...#####......#',
      '#....#........#....C.....#',
      '#....#...C....#..........#',
      '#....#........#....D.....#',
      '#....######...#####......#',
      '#........................#',
      '#..C....#.....#....A.....#',
      '#.......#..L..#.....C....#',
      '#.......#.....#......E...#',
      '##########################',
    ],
    guards: [
      { name: 'Mara', waypoints: [[22, 1], [22, 4]], pause: 1.4 },
      { name: 'Ilya', waypoints: [[2, 2], [2, 8]], pause: 1.0 },
      { name: 'Bram', waypoints: [[9, 10], [18, 10]], pause: 1.2 },
    ],
  },
  {
    name: 'The Star Gallery',
    intro: 'Three relics under the skylight, four guards on the floor. The night is yours — take it quietly.',
    map: [
      '##########################',
      '#P..#.....#......#...A...#',
      '#...#..C..#..L...#.......#',
      '#.C....D......C......C...#',
      '#...#.....#......#.......#',
      '#...######..######..##...#',
      '#...#........#........#..#',
      '#.L.#...C....#...C....#..#',
      '#...#........#........#..#',
      '#...######..######..##...#',
      '#........................#',
      '#..C...#....A....#....E..#',
      '#......#.........#.......#',
      '#..L...#....C....#...A...#',
      '##########################',
    ],
    guards: [
      { name: 'Mara', waypoints: [[23, 1], [23, 4]], pause: 1.2 },
      { name: 'Ilya', waypoints: [[5, 10], [20, 10]], pause: 1.0 },
      { name: 'Bram', waypoints: [[12, 1], [12, 3]], pause: 1.4 },
      { name: 'Sable', waypoints: [[2, 13], [6, 13]], pause: 1.0 },
    ],
  },
];

/** Read a tile from a level map, treating out-of-bounds as a wall. */
export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return TILE_WALL;
  return level.map[ty][tx];
}

/** Find every tile holding a character (artifacts, exit, start, lamps). */
export function findTiles(level, wanted) {
  const found = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.map[y][x] === wanted) found.push({ tx: x, ty: y });
    }
  }
  return found;
}
