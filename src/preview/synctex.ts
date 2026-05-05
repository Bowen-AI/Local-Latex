import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const SP_PER_POINT = 65536;
const MAX_TEXT_BOX_HEIGHT = 36 * SP_PER_POINT;
const MAX_VERTICAL_JUMP = 72 * SP_PER_POINT;
const CLICK_MARGIN = 4 * SP_PER_POINT;

export interface SyncTexRecord {
  page: number;
  inputId: number;
  file: string;
  line: number;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface SyncTexDocument {
  inputs: Map<number, string>;
  records: SyncTexRecord[];
}

export interface PdfClick {
  page: number;
  pdfX: number;
  pdfY: number;
  pageHeight: number;
}

export interface SyncTexTarget {
  file: string;
  line: number;
}

const INPUT_REGEX = /^Input:(\d+):(.*)$/;
const PAGE_START_REGEX = /^\{(\d+)$/;
const PAGE_END_REGEX = /^\}(\d+)$/;
const RECORD_REGEX = /^[[(gkrvx](-?\d+),(-?\d+):(-?\d+),(-?\d+)(?::(-?\d+)(?:,(-?\d+),(-?\d+))?)?/;

export function getSyncTexPath(pdfPath: string): string {
  return pdfPath.replace(/\.pdf$/i, '.synctex.gz');
}

export function readSyncTexDocument(pdfPath: string): SyncTexDocument | undefined {
  const syncTexPath = getSyncTexPath(pdfPath);
  if (!fs.existsSync(syncTexPath)) {
    return undefined;
  }

  const raw = fs.readFileSync(syncTexPath);
  const text = zlib.gunzipSync(raw).toString('utf-8');
  return parseSyncTex(text);
}

export function parseSyncTex(text: string): SyncTexDocument {
  const inputs = new Map<number, string>();
  const records: SyncTexRecord[] = [];
  let currentPage = 0;

  for (const line of text.split(/\r?\n/)) {
    const inputMatch = INPUT_REGEX.exec(line);
    if (inputMatch) {
      const file = inputMatch[2].trim();
      if (file) {
        inputs.set(Number(inputMatch[1]), file);
      }
      continue;
    }

    const pageStart = PAGE_START_REGEX.exec(line);
    if (pageStart) {
      currentPage = Number(pageStart[1]);
      continue;
    }

    if (PAGE_END_REGEX.test(line)) {
      currentPage = 0;
      continue;
    }

    if (!currentPage) {
      continue;
    }

    const recordMatch = RECORD_REGEX.exec(line);
    if (!recordMatch) {
      continue;
    }

    const inputId = Number(recordMatch[1]);
    const sourceLine = Number(recordMatch[2]);
    const sourceFile = inputs.get(inputId);
    if (sourceLine < 1 || !sourceFile) {
      continue;
    }

    records.push({
      page: currentPage,
      inputId,
      file: sourceFile,
      line: sourceLine,
      x: Number(recordMatch[3]),
      y: Number(recordMatch[4]),
      width: Number(recordMatch[5] ?? 0),
      height: Number(recordMatch[6] ?? 0),
      depth: Number(recordMatch[7] ?? 0),
    });
  }

  return { inputs, records };
}

export function findSyncTexTarget(
  document: SyncTexDocument,
  click: PdfClick,
  workspaceRoot: string
): SyncTexTarget | undefined {
  const clickX = Math.round(click.pdfX * SP_PER_POINT);
  const clickY = Math.round((click.pageHeight - click.pdfY) * SP_PER_POINT);

  let best: { record: SyncTexRecord; score: number; verticalDistance: number } | undefined;

  for (const record of document.records) {
    if (record.page !== click.page || Math.abs(record.height) > MAX_TEXT_BOX_HEIGHT) {
      continue;
    }

    const verticalDistance = distanceToRange(
      clickY,
      record.y - Math.max(0, record.height) - CLICK_MARGIN,
      record.y + Math.max(0, record.depth) + CLICK_MARGIN
    );

    const horizontalDistance = record.width
      ? distanceToRange(
        clickX,
        Math.min(record.x, record.x + record.width) - CLICK_MARGIN,
        Math.max(record.x, record.x + record.width) + CLICK_MARGIN
      )
      : Math.abs(clickX - record.x);

    const score = verticalDistance * 4 + horizontalDistance;
    if (!best || score < best.score) {
      best = { record, score, verticalDistance };
    }
  }

  if (!best || best.verticalDistance > MAX_VERTICAL_JUMP) {
    return undefined;
  }

  const file = path.isAbsolute(best.record.file)
    ? best.record.file
    : path.resolve(workspaceRoot, best.record.file);

  return {
    file,
    line: best.record.line,
  };
}

function distanceToRange(value: number, start: number, end: number): number {
  if (value < start) {
    return start - value;
  }

  if (value > end) {
    return value - end;
  }

  return 0;
}
