// Pure helpers for the shortcut tree: a root list whose items may be folders
// ({ type: 'folder', children: [...] }). Every helper returns the original
// array when nothing changes so callers can cheaply detect no-op moves.

export const ROOT_CONTAINER = 'root';

export const isFolder = (item) => item?.type === 'folder';

export const createFolderId = () => `folder-${Date.now()}`;

const createFolder = (children) => ({
    id: createFolderId(),
    title: 'Folder',
    type: 'folder',
    children,
});

export function locateShortcut(shortcuts, id) {
    const rootIndex = shortcuts.findIndex((item) => item.id === id);
    if (rootIndex !== -1) {
        return { item: shortcuts[rootIndex], containerId: ROOT_CONTAINER, index: rootIndex, folder: null };
    }

    for (const folder of shortcuts) {
        if (!isFolder(folder) || !folder.children) continue;
        const index = folder.children.findIndex((child) => child.id === id);
        if (index !== -1) {
            return { item: folder.children[index], containerId: folder.id, index, folder };
        }
    }

    return null;
}

export function getContainerItems(shortcuts, containerId) {
    if (containerId === ROOT_CONTAINER) return shortcuts;
    const folder = shortcuts.find((item) => item.id === containerId && isFolder(item));
    return folder?.children ?? [];
}

function replaceContainerItems(shortcuts, containerId, items) {
    if (containerId === ROOT_CONTAINER) return items;
    return shortcuts.map((item) => (item.id === containerId ? { ...item, children: items } : item));
}

/**
 * Moves `activeId` directly before or after `targetId` inside their shared container.
 */
export function moveShortcut(shortcuts, activeId, targetId, placement) {
    if (activeId === targetId) return shortcuts;

    const active = locateShortcut(shortcuts, activeId);
    const target = locateShortcut(shortcuts, targetId);
    if (!active || !target || active.containerId !== target.containerId) return shortcuts;

    let toIndex = placement === 'before' ? target.index : target.index + 1;
    if (active.index < toIndex) toIndex -= 1;
    if (toIndex === active.index) return shortcuts;

    const items = [...getContainerItems(shortcuts, active.containerId)];
    const [moved] = items.splice(active.index, 1);
    items.splice(toIndex, 0, moved);
    return replaceContainerItems(shortcuts, active.containerId, items);
}

export function canMergeShortcuts(active, target) {
    return Boolean(active && target) && active.id !== target.id && !isFolder(active);
}

/**
 * Drops a root-level shortcut onto another root-level item: appends it to a
 * folder, or turns two shortcuts into a new folder at the target's position.
 */
export function mergeShortcuts(shortcuts, activeId, targetId, makeFolder = createFolder) {
    const active = locateShortcut(shortcuts, activeId);
    const target = locateShortcut(shortcuts, targetId);
    if (
        !active ||
        !target ||
        active.containerId !== ROOT_CONTAINER ||
        target.containerId !== ROOT_CONTAINER ||
        !canMergeShortcuts(active.item, target.item)
    ) {
        return shortcuts;
    }

    const merged = isFolder(target.item)
        ? { ...target.item, children: [...(target.item.children ?? []), active.item] }
        : makeFolder([target.item, active.item]);

    return shortcuts
        .filter((item) => item.id !== activeId)
        .map((item) => (item.id === targetId ? merged : item));
}

/**
 * Moves a folder child to the root list, right after its folder. A folder
 * left empty is replaced by the extracted shortcut.
 */
export function extractFromFolder(shortcuts, activeId) {
    const active = locateShortcut(shortcuts, activeId);
    if (!active || active.containerId === ROOT_CONTAINER) return shortcuts;

    const folderIndex = shortcuts.findIndex((item) => item.id === active.containerId);
    const children = active.folder.children.filter((child) => child.id !== activeId);
    const next = [...shortcuts];

    if (children.length === 0) {
        next.splice(folderIndex, 1, active.item);
    } else {
        next.splice(folderIndex, 1, { ...active.folder, children }, active.item);
    }

    return next;
}
