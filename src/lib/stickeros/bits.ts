import {
  STICKEROS_BLOCK_SIZE,
  STICKEROS_LAST_BYTE_VALID_MASK,
} from "@/lib/stickeros/album";

export type StickerOsBitPosition = {
  byteIndex: number;
  bitIndex: number;
  mask: number;
};

export function getBitPosition(index: number): StickerOsBitPosition {
  return {
    byteIndex: Math.floor(index / 8),
    bitIndex: index % 8,
    mask: 1 << index % 8,
  };
}

export function isOwned(block1: Uint8Array, index: number): boolean {
  const { byteIndex, mask } = getBitPosition(index);

  return (block1[byteIndex] & mask) === 0;
}

export function setOwned(block1: Uint8Array, index: number): void {
  const { byteIndex, mask } = getBitPosition(index);

  block1[byteIndex] &= ~mask;
}

export function isDuplicate(block2: Uint8Array, index: number): boolean {
  const { byteIndex, mask } = getBitPosition(index);

  return (block2[byteIndex] & mask) !== 0;
}

export function setDuplicate(block2: Uint8Array, index: number): void {
  const { byteIndex, mask } = getBitPosition(index);

  block2[byteIndex] |= mask;
}

export function createEmptyOwnedBlock(): Buffer {
  const block = Buffer.alloc(STICKEROS_BLOCK_SIZE, 0xff);
  normalizePaddingBits(block);

  return block;
}

export function createEmptyDuplicateBlock(): Buffer {
  const block = Buffer.alloc(STICKEROS_BLOCK_SIZE, 0x00);
  normalizePaddingBits(block);

  return block;
}

export function normalizePaddingBits(block: Uint8Array): void {
  block[STICKEROS_BLOCK_SIZE - 1] &= STICKEROS_LAST_BYTE_VALID_MASK;
}
