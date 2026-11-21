import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ROOT_CONTAINER,
    extractFromFolder,
    locateShortcut,
    mergeShortcuts,
    moveShortcut,
} from './shortcutTree.js';

const site = (id) => ({ id, title: `Site ${id}`, url: `https://${id}.example` });
const folder = (id, children) => ({ id, title: 'Folder', type: 'folder', children });
const ids = (items) => items.map((item) => item.id);
const makeFolder = (children) => folder('new-folder', children);

describe('locateShortcut', () => {
    it('finds root items and folder children', () => {
        const tree = [site(1), folder('f', [site(2), site(3)])];
        assert.deepEqual(
            { containerId: locateShortcut(tree, 1).containerId, index: locateShortcut(tree, 1).index },
            { containerId: ROOT_CONTAINER, index: 0 },
        );
        const child = locateShortcut(tree, 3);
        assert.equal(child.containerId, 'f');
        assert.equal(child.index, 1);
        assert.equal(locateShortcut(tree, 99), null);
    });

    it('treats numeric ids such as 0 as valid', () => {
        assert.equal(locateShortcut([site(0)], 0).index, 0);
    });
});

describe('moveShortcut', () => {
    const list = [site(1), site(2), site(3), site(4), site(5)];

    it('inserts before or after the target in both directions', () => {
        assert.deepEqual(ids(moveShortcut(list, 1, 4, 'before')), [2, 3, 1, 4, 5]);
        assert.deepEqual(ids(moveShortcut(list, 1, 4, 'after')), [2, 3, 4, 1, 5]);
        assert.deepEqual(ids(moveShortcut(list, 5, 2, 'before')), [1, 5, 2, 3, 4]);
        assert.deepEqual(ids(moveShortcut(list, 5, 2, 'after')), [1, 2, 5, 3, 4]);
    });

    it('keeps the target in place when approached from its near side', () => {
        const moved = moveShortcut(list, 1, 4, 'before');
        assert.equal(ids(moved).indexOf(4), ids(list).indexOf(4));
    });

    it('returns the same array for no-op moves', () => {
        assert.equal(moveShortcut(list, 2, 3, 'before'), list);
        assert.equal(moveShortcut(list, 3, 2, 'after'), list);
        assert.equal(moveShortcut(list, 3, 3, 'after'), list);
    });

    it('reorders inside a folder without touching the root order', () => {
        const tree = [site(1), folder('f', [site(2), site(3), site(4)])];
        const next = moveShortcut(tree, 2, 4, 'after');
        assert.deepEqual(ids(next), [1, 'f']);
        assert.deepEqual(ids(next[1].children), [3, 4, 2]);
    });

    it('refuses to move between containers', () => {
        const tree = [site(1), folder('f', [site(2)])];
        assert.equal(moveShortcut(tree, 1, 2, 'before'), tree);
    });
});

describe('mergeShortcuts', () => {
    it('creates a folder at the target position', () => {
        const tree = [site(1), site(2), site(3)];
        const next = mergeShortcuts(tree, 3, 1, makeFolder);
        assert.deepEqual(ids(next), ['new-folder', 2]);
        assert.deepEqual(ids(next[0].children), [1, 3]);
    });

    it('appends to an existing folder', () => {
        const tree = [folder('f', [site(1)]), site(2)];
        const next = mergeShortcuts(tree, 2, 'f');
        assert.deepEqual(ids(next), ['f']);
        assert.deepEqual(ids(next[0].children), [1, 2]);
    });

    it('never nests folders', () => {
        const tree = [folder('a', [site(1)]), folder('b', [site(2)])];
        assert.equal(mergeShortcuts(tree, 'a', 'b'), tree);
    });
});

describe('extractFromFolder', () => {
    it('places the child right after its folder', () => {
        const tree = [site(1), folder('f', [site(2), site(3)]), site(4)];
        const next = extractFromFolder(tree, 2);
        assert.deepEqual(ids(next), [1, 'f', 2, 4]);
        assert.deepEqual(ids(next[1].children), [3]);
    });

    it('replaces a folder that becomes empty', () => {
        const tree = [site(1), folder('f', [site(2)])];
        assert.deepEqual(ids(extractFromFolder(tree, 2)), [1, 2]);
    });

    it('ignores root items', () => {
        const tree = [site(1)];
        assert.equal(extractFromFolder(tree, 1), tree);
    });
});
