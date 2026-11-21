import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DROP_INTENT, resolveDropIntent } from './dragIntent.js';

// A 4-column grid of 80px icons with a 120px horizontal and 130px vertical pitch.
const SIZE = 80;
const PITCH_X = 120;
const PITCH_Y = 130;
const COLS = 4;

const makeTargets = (count) =>
    Array.from({ length: count }, (_, index) => ({
        id: index,
        index,
        rect: {
            left: (index % COLS) * PITCH_X,
            top: Math.floor(index / COLS) * PITCH_Y,
            width: SIZE,
            height: SIZE,
        },
    }));

const centerOf = (index) => ({
    x: (index % COLS) * PITCH_X + SIZE / 2,
    y: Math.floor(index / COLS) * PITCH_Y + SIZE / 2,
});

const resolve = (pointer, overrides = {}) =>
    resolveDropIntent({
        pointer,
        targets: makeTargets(8),
        activeId: 0,
        activeIndex: 0,
        canMerge: () => true,
        ...overrides,
    });

describe('resolveDropIntent', () => {
    it('merges when the pointer is over the middle of an icon', () => {
        assert.deepEqual(resolve(centerOf(5)), { type: DROP_INTENT.MERGE, targetId: 5 });
    });

    it('reorders when the pointer is on either side of an icon', () => {
        const { x, y } = centerOf(5);
        assert.deepEqual(resolve({ x: x - 35, y }), { type: DROP_INTENT.BEFORE, targetId: 5 });
        assert.deepEqual(resolve({ x: x + 35, y }), { type: DROP_INTENT.AFTER, targetId: 5 });
    });

    it('resolves gaps between icons to the nearest neighbour', () => {
        const y = centerOf(5).y;
        // Gap between icon 5 (ends at 200) and icon 6 (starts at 240).
        assert.deepEqual(resolve({ x: 210, y }), { type: DROP_INTENT.AFTER, targetId: 5 });
        assert.deepEqual(resolve({ x: 230, y }), { type: DROP_INTENT.BEFORE, targetId: 6 });
    });

    it('is a no-op over the dragged item placeholder', () => {
        assert.deepEqual(resolve(centerOf(0)), { type: DROP_INTENT.NONE });
        assert.deepEqual(resolve({ x: centerOf(0).x + 38, y: centerOf(0).y }), { type: DROP_INTENT.NONE });
    });

    it('takes the slot when merging is not allowed', () => {
        const noMerge = { canMerge: () => false };
        assert.deepEqual(resolve(centerOf(5), noMerge), { type: DROP_INTENT.AFTER, targetId: 5 });
        assert.deepEqual(
            resolve(centerOf(2), { ...noMerge, activeId: 7, activeIndex: 7 }),
            { type: DROP_INTENT.BEFORE, targetId: 2 },
        );
    });

    it('does not merge when the pointer is below the icon (title area)', () => {
        const { x } = centerOf(5);
        assert.deepEqual(resolve({ x, y: PITCH_Y + SIZE + 20 }), { type: DROP_INTENT.NONE });
    });

    it('appends after the last icon from the empty cells of a partial row', () => {
        const targets = makeTargets(6); // second row holds icons 4 and 5
        const pointer = { x: 3 * PITCH_X + SIZE / 2, y: centerOf(5).y };
        assert.deepEqual(resolve(pointer, { targets }), { type: DROP_INTENT.AFTER, targetId: 5 });
    });

    it('ignores pointers far outside the grid', () => {
        assert.deepEqual(resolve({ x: 2000, y: 40 }), { type: DROP_INTENT.NONE });
        assert.deepEqual(resolve({ x: 40, y: -500 }), { type: DROP_INTENT.NONE });
    });

    it('keeps a confirmed merge target while the pointer wobbles around it', () => {
        const { x, y } = centerOf(5);
        const wobble = { x: x + 35, y };
        assert.equal(resolve(wobble).type, DROP_INTENT.AFTER);
        assert.deepEqual(resolve(wobble, { stickyMergeId: 5 }), { type: DROP_INTENT.MERGE, targetId: 5 });
    });

    it('returns no intent without targets or pointer', () => {
        assert.deepEqual(resolve(null), { type: DROP_INTENT.NONE });
        assert.deepEqual(resolve(centerOf(1), { targets: [] }), { type: DROP_INTENT.NONE });
    });
});
