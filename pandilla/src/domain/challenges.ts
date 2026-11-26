import type { BingoCell, BingoMark } from './types'

export function gridSize(cells: BingoCell[]): number {
  return cells.length <= 9 ? 3 : cells.length <= 16 ? 4 : 5
}

/** Líneas completas (filas, columnas y diagonales) de un cartón cuadrado. */
export function completedLines(cells: BingoCell[], marks: BingoMark[]): number {
  const size = gridSize(cells)
  if (cells.length !== size * size) return 0
  const done = new Set(marks.map((m) => m.cellId))
  const at = (r: number, c: number) => done.has(cells[r * size + c].id)
  let lines = 0
  for (let r = 0; r < size; r++) if (Array.from({ length: size }, (_, c) => at(r, c)).every(Boolean)) lines++
  for (let c = 0; c < size; c++) if (Array.from({ length: size }, (_, r) => at(r, c)).every(Boolean)) lines++
  if (Array.from({ length: size }, (_, i) => at(i, i)).every(Boolean)) lines++
  if (Array.from({ length: size }, (_, i) => at(i, size - 1 - i)).every(Boolean)) lines++
  return lines
}
