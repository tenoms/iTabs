import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DROP_INTENT, NO_INTENT, isPointInRect, resolveDropIntent } from '../utils/dragIntent';
import {
    ROOT_CONTAINER,
    canMergeShortcuts,
    extractFromFolder,
    getContainerItems,
    locateShortcut,
    mergeShortcuts,
    moveShortcut,
} from '../utils/shortcutTree';

export const FOLDER_PANEL_DROPPABLE_ID = 'folder-modal-panel';

// The collision detector returns a single synthetic collision carrying the
// resolved intent. Because its id is not a sortable item, dnd-kit's sorting
// strategy never displaces items on its own: the live order comes from the
// draft list below, and useSortable only animates the resulting layout changes.
const INTENT_COLLISION_ID = 'shortcut-drop-intent';

const MERGE_DELAY = 350;
const DRAG_OUT_DELAY = 250;
const PAGE_FLIP_DELAY = 600;
const PAGE_FLIP_REPEAT = 900;
const PAGE_EDGE_SIZE = 48;

// Icon box inside a sortable cell, derived from the measured cell rect and the
// `icon` geometry ({ size, offsetTop, scale }) each item puts in its sortable data.
const getIconRect = (rect, icon) => {
    if (!icon) return rect;
    const scale = icon.scale ?? 1;
    const size = icon.size * scale;
    return {
        left: rect.left + (rect.width - size) / 2,
        top: rect.top + (icon.offsetTop ?? 0) * scale,
        width: size,
        height: size,
    };
};

const createSession = (activeId) => ({
    activeId,
    intent: NO_INTENT,
    mergeCandidateId: null,
    mergeTimer: null,
    dragOutTimer: null,
    edgeDirection: 0,
    edgeTimer: null,
});

const clearSessionTimers = (session) => {
    clearTimeout(session.mergeTimer);
    clearTimeout(session.dragOutTimer);
    clearTimeout(session.edgeTimer);
};

/**
 * Drag and drop for the shortcut grid and the folder modal.
 *
 * While dragging, all changes go to a draft copy of `shortcuts`; it is
 * committed once through `onCommit` on drop and discarded on cancel.
 */
export function useShortcutDnd({
    shortcuts,
    onCommit,
    itemsPerPage,
    currentPage,
    onFlipPage,
    getPagerRect,
    onDragOutOfFolder,
}) {
    const [draft, setDraft] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [originContainerId, setOriginContainerId] = useState(null);
    const [mergeTargetId, setMergeTargetId] = useState(null);

    const draftRef = useRef(null);
    const sessionRef = useRef(null);
    const mergeTargetRef = useRef(null);
    const latestRef = useRef({ itemsPerPage, currentPage, onFlipPage, getPagerRect, onDragOutOfFolder });

    useLayoutEffect(() => {
        latestRef.current = { itemsPerPage, currentPage, onFlipPage, getPagerRect, onDragOutOfFolder };
    });

    const disposeSession = useCallback(() => {
        if (sessionRef.current) clearSessionTimers(sessionRef.current);
        sessionRef.current = null;
    }, []);

    useEffect(() => disposeSession, [disposeSession]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    const updateDraft = useCallback((next) => {
        draftRef.current = next;
        setDraft(next);
    }, []);

    const setConfirmedMerge = useCallback((id) => {
        mergeTargetRef.current = id;
        setMergeTargetId(id);
    }, []);

    const collisionDetection = useCallback(({ active, droppableRects, droppableContainers, pointerCoordinates }) => {
        const items = draftRef.current;
        if (!items || !pointerCoordinates) return [];

        const location = locateShortcut(items, active.id);
        if (!location) return [];

        const pointer = pointerCoordinates;
        const toCollisions = (intent) => [{ id: INTENT_COLLISION_ID, data: { ...intent, pointer } }];
        const isRoot = location.containerId === ROOT_CONTAINER;

        if (!isRoot) {
            const panelRect = droppableRects.get(FOLDER_PANEL_DROPPABLE_ID);
            if (panelRect && !isPointInRect(pointer, panelRect)) {
                return toCollisions({ type: DROP_INTENT.OUT });
            }
        }

        // Only items of the dragged item's own container (and, on the root
        // grid, the current page) are candidates. This also keeps root icons
        // hidden behind the folder modal out of play.
        const containerItems = getContainerItems(items, location.containerId);
        const { itemsPerPage: perPage, currentPage: page } = latestRef.current;
        const start = isRoot ? page * perPage : 0;
        const candidates = isRoot ? containerItems.slice(start, start + perPage) : containerItems;
        const iconById = new Map(droppableContainers.map((container) => [container.id, container.data.current?.icon]));

        const targets = [];
        candidates.forEach((item, offset) => {
            const rect = droppableRects.get(item.id);
            if (rect) {
                targets.push({ id: item.id, index: start + offset, rect: getIconRect(rect, iconById.get(item.id)) });
            }
        });

        return toCollisions(resolveDropIntent({
            pointer,
            targets,
            activeId: active.id,
            activeIndex: location.index,
            canMerge: isRoot
                ? (targetId) => canMergeShortcuts(location.item, containerItems.find((item) => item.id === targetId))
                : undefined,
            stickyMergeId: mergeTargetRef.current,
        }));
    }, []);

    const cancelMerge = (session) => {
        clearTimeout(session.mergeTimer);
        session.mergeTimer = null;
        session.mergeCandidateId = null;
        if (mergeTargetRef.current != null) setConfirmedMerge(null);
    };

    const cancelDragOut = (session) => {
        clearTimeout(session.dragOutTimer);
        session.dragOutTimer = null;
    };

    const extractActiveFromFolder = () => {
        const session = sessionRef.current;
        if (!session) return;
        session.dragOutTimer = null;

        const current = draftRef.current;
        const next = extractFromFolder(current, session.activeId);
        if (next === current) return;
        updateDraft(next);
        latestRef.current.onDragOutOfFolder?.();
    };

    // Holding the pointer near the left/right edge of the grid flips pages,
    // repeatedly while it stays there.
    const updatePageFlip = (session, pointer, isRoot) => {
        const rect = isRoot && pointer ? latestRef.current.getPagerRect?.() : null;
        let direction = 0;
        if (rect) {
            if (pointer.x <= rect.left + PAGE_EDGE_SIZE) direction = -1;
            else if (pointer.x >= rect.right - PAGE_EDGE_SIZE) direction = 1;
        }

        if (direction === session.edgeDirection) return;
        clearTimeout(session.edgeTimer);
        session.edgeTimer = null;
        session.edgeDirection = direction;
        if (!direction) return;

        const flip = () => {
            latestRef.current.onFlipPage?.(direction);
            session.edgeTimer = setTimeout(flip, PAGE_FLIP_REPEAT);
        };
        session.edgeTimer = setTimeout(flip, PAGE_FLIP_DELAY);
    };

    const applyIntent = (intent) => {
        const session = sessionRef.current;
        const current = draftRef.current;
        if (!session || !current) return;
        session.intent = intent;

        const location = locateShortcut(current, session.activeId);
        updatePageFlip(session, intent.pointer, location?.containerId === ROOT_CONTAINER);

        if (intent.type !== DROP_INTENT.OUT) cancelDragOut(session);
        if (intent.type !== DROP_INTENT.MERGE || intent.targetId !== session.mergeCandidateId) {
            cancelMerge(session);
        }

        switch (intent.type) {
            case DROP_INTENT.BEFORE:
            case DROP_INTENT.AFTER: {
                const next = moveShortcut(current, session.activeId, intent.targetId, intent.type);
                if (next !== current) updateDraft(next);
                break;
            }
            case DROP_INTENT.MERGE:
                if (session.mergeCandidateId !== intent.targetId) {
                    const { targetId } = intent;
                    session.mergeCandidateId = targetId;
                    session.mergeTimer = setTimeout(() => setConfirmedMerge(targetId), MERGE_DELAY);
                }
                break;
            case DROP_INTENT.OUT:
                if (!session.dragOutTimer) {
                    session.dragOutTimer = setTimeout(extractActiveFromFolder, DRAG_OUT_DELAY);
                }
                break;
            default:
                break;
        }
    };

    const finishDrag = () => {
        disposeSession();
        draftRef.current = null;
        mergeTargetRef.current = null;
        setDraft(null);
        setActiveId(null);
        setOriginContainerId(null);
        setMergeTargetId(null);
    };

    const handleDragStart = ({ active }) => {
        disposeSession();
        sessionRef.current = createSession(active.id);
        mergeTargetRef.current = null;
        updateDraft(shortcuts);
        setActiveId(active.id);
        setOriginContainerId(locateShortcut(shortcuts, active.id)?.containerId ?? ROOT_CONTAINER);
        setMergeTargetId(null);
    };

    const handleDragMove = ({ collisions }) => {
        applyIntent(collisions?.[0]?.data ?? NO_INTENT);
    };

    const handleDragEnd = ({ collisions }) => {
        const session = sessionRef.current;
        let next = draftRef.current;

        if (session && next) {
            // Apply what the final pointer position resolves to, so a drop never
            // depends on whether a pending timer happened to fire first.
            const intent = collisions?.[0]?.data ?? session.intent;
            switch (intent.type) {
                case DROP_INTENT.BEFORE:
                case DROP_INTENT.AFTER:
                    next = moveShortcut(next, session.activeId, intent.targetId, intent.type);
                    break;
                case DROP_INTENT.MERGE:
                    if (intent.targetId === mergeTargetRef.current) {
                        next = mergeShortcuts(next, session.activeId, intent.targetId);
                    }
                    break;
                case DROP_INTENT.OUT: {
                    const extracted = extractFromFolder(next, session.activeId);
                    if (extracted !== next) {
                        next = extracted;
                        latestRef.current.onDragOutOfFolder?.();
                    }
                    break;
                }
                default:
                    break;
            }
        }

        finishDrag();
        if (next && next !== shortcuts) onCommit?.(next);
    };

    const items = draft ?? shortcuts;
    const activeItem = activeId != null ? locateShortcut(items, activeId)?.item ?? null : null;

    return {
        items,
        activeId,
        activeItem,
        originContainerId,
        mergeTargetId,
        dndContextProps: {
            sensors,
            collisionDetection,
            autoScroll: false,
            onDragStart: handleDragStart,
            onDragMove: handleDragMove,
            onDragEnd: handleDragEnd,
            onDragCancel: finishDrag,
        },
    };
}
