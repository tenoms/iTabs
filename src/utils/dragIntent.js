// Pointer-based hit testing for the icon grid.
//
// The model follows the "reorder-before / reorder-after / combine" hitbox used
// by Atlassian's Pragmatic drag and drop, adapted to a wrapping grid:
//   - the pointer picks a row, then the nearest icon inside that row, so gaps
//     between icons and empty cells at the end of a row are never dead zones;
//   - the middle strip of an icon means "merge" (when merging is allowed),
//     its sides mean "insert before/after", so a merge target never moves away
//     from under the pointer while the user is aiming at it;
//   - hovering the dragged item's own placeholder is a no-op, which keeps live
//     reordering stable instead of oscillating.

export const DROP_INTENT = Object.freeze({
    NONE: 'none',
    BEFORE: 'before',
    AFTER: 'after',
    MERGE: 'merge',
    OUT: 'out',
});

export const NO_INTENT = Object.freeze({ type: DROP_INTENT.NONE });

const DEFAULT_OPTIONS = {
    // Share of the icon width (centered) that counts as the merge strip.
    mergeZone: 0.6,
    // Once a merge target is confirmed, keep it while the pointer stays within
    // the icon grown by this share of its width (hysteresis against jitter).
    stickyMargin: 0.15,
};

const rightOf = (rect) => rect.left + rect.width;
const bottomOf = (rect) => rect.top + rect.height;

export const isPointInRect = (point, rect, margin = 0) =>
    point.x >= rect.left - margin &&
    point.x <= rightOf(rect) + margin &&
    point.y >= rect.top - margin &&
    point.y <= bottomOf(rect) + margin;

const distanceToRange = (value, start, end) => {
    if (value < start) return start - value;
    if (value > end) return value - end;
    return 0;
};

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
};

function groupIntoRows(targets) {
    const sorted = [...targets].sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    const rows = [];

    for (const target of sorted) {
        const row = rows[rows.length - 1];
        if (row && Math.abs(target.rect.top - row.top) < target.rect.height / 2) {
            row.items.push(target);
            row.bottom = Math.max(row.bottom, bottomOf(target.rect));
        } else {
            rows.push({ top: target.rect.top, bottom: bottomOf(target.rect), items: [target] });
        }
    }

    rows.forEach((row) => row.items.sort((a, b) => a.rect.left - b.rect.left));
    return rows;
}

function getPitch(rows, sample) {
    const horizontal = [];
    rows.forEach((row) => {
        for (let i = 1; i < row.items.length; i += 1) {
            horizontal.push(row.items[i].rect.left - row.items[i - 1].rect.left);
        }
    });
    const vertical = rows.slice(1).map((row, i) => row.top - rows[i].top);

    return {
        x: horizontal.length ? median(horizontal) : sample.width * 1.5,
        y: vertical.length ? median(vertical) : sample.height * 1.5,
    };
}

const pickClosest = (candidates, distance) =>
    candidates.reduce((best, candidate) => (distance(candidate) < distance(best) ? candidate : best));

/**
 * Resolves what dropping at `pointer` would do.
 *
 * @param {object} params
 * @param {{x: number, y: number}} params.pointer Viewport coordinates.
 * @param {Array<{id: *, index: number, rect: {left: number, top: number, width: number, height: number}}>} params.targets
 *   Icon boxes of the visible items in the dragged item's container, including the dragged item itself.
 * @param {*} params.activeId
 * @param {number} params.activeIndex Index of the dragged item in its container.
 * @param {(targetId: *) => boolean} [params.canMerge]
 * @param {*} [params.stickyMergeId] Merge target that is already confirmed.
 * @returns {{type: string, targetId?: *}}
 */
export function resolveDropIntent({
    pointer,
    targets,
    activeId,
    activeIndex,
    canMerge = () => false,
    stickyMergeId = null,
    options,
}) {
    if (!pointer || !targets?.length) return NO_INTENT;
    const { mergeZone, stickyMargin } = { ...DEFAULT_OPTIONS, ...options };

    if (stickyMergeId != null) {
        const sticky = targets.find((target) => target.id === stickyMergeId);
        if (sticky && isPointInRect(pointer, sticky.rect, sticky.rect.width * stickyMargin)) {
            return { type: DROP_INTENT.MERGE, targetId: sticky.id };
        }
    }

    const rows = groupIntoRows(targets);
    const pitch = getPitch(rows, targets[0].rect);
    const left = Math.min(...targets.map((target) => target.rect.left));
    const right = Math.max(...targets.map((target) => rightOf(target.rect)));
    const top = rows[0].top;
    const bottom = rows[rows.length - 1].bottom;

    if (
        pointer.x < left - pitch.x / 2 ||
        pointer.x > right + pitch.x / 2 ||
        pointer.y < top - pitch.y / 2 ||
        pointer.y > bottom + pitch.y / 2
    ) {
        return NO_INTENT;
    }

    const row = pickClosest(rows, (candidate) => distanceToRange(pointer.y, candidate.top, candidate.bottom));
    const target = pickClosest(row.items, (candidate) =>
        distanceToRange(pointer.x, candidate.rect.left, rightOf(candidate.rect)),
    );

    if (target.id === activeId) return NO_INTENT;

    const { rect } = target;
    const offsetX = pointer.x - (rect.left + rect.width / 2);
    const inMiddleStrip = Math.abs(offsetX) <= (rect.width * mergeZone) / 2;

    if (inMiddleStrip) {
        if (canMerge(target.id)) {
            const overIcon = pointer.y >= rect.top && pointer.y <= bottomOf(rect);
            return overIcon ? { type: DROP_INTENT.MERGE, targetId: target.id } : NO_INTENT;
        }
        // Without merging, the middle of an icon means "take its slot".
        return {
            type: activeIndex < target.index ? DROP_INTENT.AFTER : DROP_INTENT.BEFORE,
            targetId: target.id,
        };
    }

    return { type: offsetX < 0 ? DROP_INTENT.BEFORE : DROP_INTENT.AFTER, targetId: target.id };
}
