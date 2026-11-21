import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { DndContext, DragOverlay, useDndContext } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIconSource } from '../hooks/useIconSource';
import { useShortcutDnd } from '../hooks/useShortcutDnd';
import { ROOT_CONTAINER, isFolder } from '../utils/shortcutTree';
import EditShortcutModal from './EditShortcutModal';
import FolderIcon from './FolderIcon';
import FolderModal, { FolderItemTile } from './FolderModal';

const PAGE_TRANSITION_MS = 300;

const DROP_ANIMATION = {
    duration: 220,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

// Auto-calculate gaps based on grid size
const calculateGaps = (cols, rows) => {
    const baseColGap = 40;
    const colGapReduction = (cols - 3) * 6;
    const colGap = Math.max(8, baseColGap - colGapReduction);

    const baseRowGap = 32;
    const rowGapReduction = (rows - 2) * 5;
    const rowGap = Math.max(12, baseRowGap - rowGapReduction);

    return { colGap, rowGap };
};

const getCellWidth = (iconSize) => Math.max(iconSize + 40, 120);

// Keeps clicks on nested controls from starting a drag on the parent cell.
const stopDragActivation = {
    onMouseDown: (e) => e.stopPropagation(),
    onTouchStart: (e) => e.stopPropagation(),
    onPointerDown: (e) => e.stopPropagation(),
};

const WebsiteShortcutIcon = ({ shortcut, iconSize, isContextOpen, onRemove, onEdit, setContextShortcutId }) => {
    const iconSrc = useIconSource(shortcut);
    const iconRef = useRef(null);

    // 动态光泽效果
    useEffect(() => {
        const element = iconRef.current;
        if (!element) return;

        const handleMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            element.style.setProperty('--mouse-x', `${x}%`);
            element.style.setProperty('--mouse-y', `${y}%`);
        };

        element.addEventListener('mousemove', handleMouseMove);
        return () => element.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            className="relative"
            style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        >
            <div
                ref={iconRef}
                className="rounded-[22px] liquid-glass-icon flex items-center justify-center overflow-hidden h-full w-full"
            >
                <div className="glass-refraction" />
                {(shortcut.customIcon?.type === 'letter' || iconSrc === false) ? (
                    <div className="flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600 rounded-[22px]" style={{ width: '80%', height: '80%' }}>
                        <span className="text-3xl font-bold text-white">
                            {(shortcut.customIcon?.letter || shortcut.title?.[0] || 'A').toUpperCase()}
                        </span>
                    </div>
                ) : (
                    iconSrc ? (
                        <img
                            src={iconSrc}
                            alt={shortcut.title}
                            loading="lazy"
                            decoding="async"
                            className="select-none pointer-events-none transition-all duration-300 rounded-[18px]"
                            style={{
                                width: shortcut.iconPadding ? '60%' : '90%',
                                height: shortcut.iconPadding ? '60%' : '90%',
                                objectFit: 'contain',
                            }}
                            draggable={false}
                            onError={(e) => {
                                if (!e.target.parentElement) return;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `<div class="flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600 rounded-[22px]" style="width: 80%; height: 80%;"><span class="text-3xl font-bold text-white">${(shortcut.title?.[0] || 'A').toUpperCase()}</span></div>`;
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-50 animate-pulse" />
                    )
                )}
            </div>

            {isContextOpen && (
                <>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-none rounded-[22px]" />
                    <button
                        type="button"
                        className="absolute -top-2 -right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-400 transition z-20"
                        {...stopDragActivation}
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.(shortcut.id);
                            setContextShortcutId?.(null);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            type="button"
                            className="w-full h-full rounded-[22px] bg-black/40 border border-white/20 text-white hover:text-blue-200 backdrop-blur-sm pointer-events-auto flex items-center justify-center transition"
                            {...stopDragActivation}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(shortcut);
                                setContextShortcutId?.(null);
                            }}
                        >
                            <Edit2 className="h-6 w-6 drop-shadow-lg" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const ShortcutIcon = (props) => {
    if (isFolder(props.shortcut)) {
        return <FolderIcon folder={props.shortcut} iconSize={props.iconSize} />;
    }
    return <WebsiteShortcutIcon {...props} />;
};

// Icon + title, shared by grid cells and the drag overlay.
const ShortcutTile = ({ shortcut, iconSize, iconClassName = '', titleClassName = '', highlight = false, ...iconProps }) => (
    <div className="flex flex-col items-center gap-3">
        <div className={`relative transition-transform duration-200 ease-out ${iconClassName}`}>
            <ShortcutIcon shortcut={shortcut} iconSize={iconSize} {...iconProps} />
            {highlight && (
                <div className="absolute -inset-2 rounded-[28px] border-2 border-white/70 bg-white/15 shadow-[0_0_24px_rgba(255,255,255,0.35)] pointer-events-none" />
            )}
        </div>
        <span className={`text-sm font-medium text-white/90 drop-shadow-md truncate text-center px-1 select-none w-full transition-opacity duration-200 ${titleClassName}`}>
            {shortcut.title}
        </span>
    </div>
);

const SortableShortcutItem = ({
    shortcut,
    iconSize,
    scale,
    contextShortcutId,
    setContextShortcutId,
    onRemoveShortcut,
    setEditingShortcut,
    onOpenFolder,
    isMergeTarget,
}) => {
    // Icon box geometry inside the cell, used by the drag hit testing.
    const data = useMemo(() => ({ icon: { size: iconSize, offsetTop: 0, scale } }), [iconSize, scale]);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isSorting,
    } = useSortable({ id: shortcut.id, data });

    const isContextOpen = contextShortcutId === shortcut.id;
    const open = () => {
        if (isFolder(shortcut)) {
            onOpenFolder(shortcut.id);
        } else {
            window.location.href = shortcut.url;
        }
    };

    return (
        <div
            data-shortcut-id={shortcut.id}
            ref={setNodeRef}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
                width: `${getCellWidth(iconSize)}px`,
                opacity: isDragging ? 0 : 1,
                zIndex: isMergeTarget ? 20 : undefined,
            }}
            {...attributes}
            {...listeners}
            className={`group relative justify-self-center h-fit touch-none ${isSorting ? '' : 'hover:z-10'}`}
            onClick={() => {
                if (isDragging || isContextOpen) return;
                open();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextShortcutId(shortcut.id);
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
                if (e.key === 'Enter') open();
            }}
        >
            {/* Hover scaling lives on an inner element so it never skews drag measurements. */}
            <div className={`transition-transform duration-300 ${isSorting ? '' : 'group-hover:scale-105'}`}>
                <ShortcutTile
                    shortcut={shortcut}
                    iconSize={iconSize}
                    iconClassName={isMergeTarget ? 'scale-110' : ''}
                    highlight={isMergeTarget}
                    isContextOpen={isContextOpen}
                    onRemove={onRemoveShortcut}
                    onEdit={setEditingShortcut}
                    setContextShortcutId={setContextShortcutId}
                />
            </div>
        </div>
    );
};

// Page changes move every cell, so refresh dnd-kit's cached rects once the
// slide transition has finished.
const DroppableRemeasurer = ({ trigger }) => {
    const { active, measureDroppableContainers } = useDndContext();
    const isDragging = active != null;

    useEffect(() => {
        if (!isDragging) return undefined;
        const timer = setTimeout(() => measureDroppableContainers(), PAGE_TRANSITION_MS + 20);
        return () => clearTimeout(timer);
    }, [isDragging, trigger, measureDroppableContainers]);

    return null;
};

const ShortcutGrid = ({ config, shortcuts, onRemoveShortcut, onEditShortcut, onReorder, leftOffset = 0 }) => {
    const { cols = 5, rows = 3, iconSize = 96 } = config || {};
    const [currentPage, setCurrentPage] = useState(0);
    const [contextShortcutId, setContextShortcutId] = useState(null);
    const [editingShortcut, setEditingShortcut] = useState(null);
    const [responsiveCols, setResponsiveCols] = useState(cols);
    const [openFolderId, setOpenFolderId] = useState(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

    const containerRef = useRef(null);
    const accumulatedRef = useRef(0);
    const lastTimeRef = useRef(0);
    const isChangingRef = useRef(false);
    const totalPagesRef = useRef(1);

    const { colGap, rowGap } = calculateGaps(responsiveCols, rows);
    const [scale, setScale] = useState(1);

    const itemsPerPage = responsiveCols * rows;

    // Snap to page
    const goToPage = useCallback((targetPage) => {
        const clampedPage = Math.max(0, Math.min(totalPagesRef.current - 1, targetPage));
        if (clampedPage !== currentPage) {
            isChangingRef.current = true;
            setCurrentPage(clampedPage);
            // Allow next page change after animation
            setTimeout(() => {
                isChangingRef.current = false;
                accumulatedRef.current = 0;
            }, 600);
        }
    }, [currentPage]);

    const {
        items,
        activeItem,
        originContainerId,
        mergeTargetId,
        dndContextProps,
    } = useShortcutDnd({
        shortcuts,
        onCommit: onReorder,
        itemsPerPage,
        currentPage,
        onFlipPage: (direction) => goToPage(currentPage + direction),
        getPagerRect: () => containerRef.current?.getBoundingClientRect() ?? null,
        onDragOutOfFolder: () => setIsFolderModalOpen(false),
    });

    const rootIds = useMemo(() => items.map((item) => item.id), [items]);
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const openFolder = items.find((item) => item.id === openFolderId && isFolder(item)) ?? null;

    useLayoutEffect(() => {
        totalPagesRef.current = totalPages;
    }, [totalPages]);

    const handleFolderUpdate = (updatedFolder) => {
        if (updatedFolder.children.length === 0) {
            onRemoveShortcut?.(updatedFolder.id);
            setIsFolderModalOpen(false);
            return;
        }
        onReorder?.(shortcuts.map((item) => (item.id === updatedFolder.id ? updatedFolder : item)));
    };

    const handleFolderDelete = () => {
        if (openFolder && onRemoveShortcut) {
            onRemoveShortcut(openFolder.id);
            setIsFolderModalOpen(false);
        }
    };

    const handleOpenFolder = (folderId) => {
        setOpenFolderId(folderId);
        setIsFolderModalOpen(true);
    };

    // Calculate scale to fit screen
    useEffect(() => {
        const handleResize = () => {
            const padding = 48; // Horizontal padding
            const availableWidth = Math.max(320, window.innerWidth - padding - leftOffset);

            // Estimate columns that can fit, then clamp to user setting
            const previewGap = calculateGaps(cols, rows).colGap;
            const maxColsFit = Math.max(1, Math.floor((availableWidth + previewGap) / (iconSize + previewGap)));
            const newCols = Math.max(1, Math.min(cols, maxColsFit));
            setResponsiveCols(newCols);

            const gaps = calculateGaps(newCols, rows);
            const requiredWidth = (newCols * iconSize) + ((newCols - 1) * gaps.colGap);

            if (requiredWidth > availableWidth) {
                const newScale = availableWidth / requiredWidth;
                setScale(Math.min(1, newScale));
            } else {
                setScale(1);
            }
        };

        handleResize(); // Initial calculation
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [cols, rows, iconSize, leftOffset]);

    // Get all pages of shortcuts
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
        const start = i * itemsPerPage;
        pages.push(items.slice(start, start + itemsPerPage));
    }

    // Reset page when shortcuts change
    useEffect(() => {
        if (currentPage >= totalPages && totalPages > 0) {
            const frame = requestAnimationFrame(() => setCurrentPage(totalPages - 1));
            return () => cancelAnimationFrame(frame);
        }
    }, [items.length, totalPages, currentPage]);

    useEffect(() => {
        if (contextShortcutId && !shortcuts.some(s => s.id === contextShortcutId)) {
            const frame = requestAnimationFrame(() => setContextShortcutId(null));
            return () => cancelAnimationFrame(frame);
        }
    }, [contextShortcutId, shortcuts]);

    useEffect(() => {
        if (!contextShortcutId) return;
        const handleClickAway = () => setContextShortcutId(null);
        document.addEventListener('click', handleClickAway);
        return () => document.removeEventListener('click', handleClickAway);
    }, [contextShortcutId]);

    // Wheel handler for mouse wheel (vertical) and trackpad (horizontal)
    useEffect(() => {
        if (totalPages <= 1) return;

        const handleWheel = (e) => {
            // Skip if page change is in progress
            if (isChangingRef.current) return;

            const now = Date.now();

            // Reset if new gesture (gap > 200ms)
            if (now - lastTimeRef.current > 200) {
                accumulatedRef.current = 0;
            }
            lastTimeRef.current = now;

            let scrollDelta = 0;

            // Detect input type:
            // - Trackpad horizontal swipe: deltaX is dominant
            // - Mouse wheel vertical: deltaY is present, deltaX is 0 or minimal
            const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY);
            const isMouseWheel = e.deltaX === 0 && e.deltaY !== 0;

            if (isHorizontalSwipe) {
                // Trackpad horizontal swipe
                scrollDelta = e.deltaX;
            } else if (isMouseWheel) {
                // Mouse wheel vertical scroll
                scrollDelta = e.deltaY;
            } else {
                // Ignore diagonal or vertical trackpad scroll
                return;
            }

            // Accumulate scroll
            accumulatedRef.current += scrollDelta;

            // Trigger page change at threshold
            const threshold = 50;

            if (accumulatedRef.current > threshold) {
                goToPage(currentPage + 1);
                accumulatedRef.current = 0; // Reset immediately
            } else if (accumulatedRef.current < -threshold) {
                goToPage(currentPage - 1);
                accumulatedRef.current = 0; // Reset immediately
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [totalPages, currentPage, goToPage]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                goToPage(currentPage - 1);
            } else if (e.key === 'ArrowRight') {
                goToPage(currentPage + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, goToPage]);

    if (shortcuts.length === 0) {
        return null;
    }

    const cellWidth = getCellWidth(iconSize);
    const isMerging = mergeTargetId != null;

    return (
        <DndContext
            {...dndContextProps}
            onDragStart={(event) => {
                setContextShortcutId(null);
                dndContextProps.onDragStart(event);
            }}
        >
            <DroppableRemeasurer trigger={currentPage} />

            {/* Swipeable Container */}
            <div
                ref={containerRef}
                className="w-full overflow-x-hidden"
            >
                <SortableContext items={rootIds}>
                    <div
                        className="flex transition-transform duration-300 ease-out"
                        style={{
                            transform: `translateX(${-currentPage * 100}%)`,
                        }}
                    >
                        {pages.map((pageShortcuts, pageIndex) => (
                            <div
                                key={pageIndex}
                                className="shrink-0 w-full flex justify-center"
                            >
                                <div
                                    className="grid px-4 py-4 transition-transform duration-300"
                                    style={{
                                        gridTemplateColumns: `repeat(${responsiveCols}, minmax(0, 1fr))`,
                                        columnGap: `${colGap}px`,
                                        rowGap: `${rowGap}px`,
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top center',
                                        // Calculate exact width to ensure grid layout is preserved before scaling
                                        width: scale < 1 ? `${(responsiveCols * iconSize) + ((responsiveCols - 1) * colGap)}px` : '100%',
                                        maxWidth: scale < 1 ? 'none' : '56rem' // 4xl
                                    }}
                                >
                                    {pageShortcuts.map((shortcut) => (
                                        <SortableShortcutItem
                                            key={shortcut.id}
                                            shortcut={shortcut}
                                            iconSize={iconSize}
                                            scale={scale}
                                            contextShortcutId={contextShortcutId}
                                            setContextShortcutId={setContextShortcutId}
                                            onRemoveShortcut={onRemoveShortcut}
                                            setEditingShortcut={setEditingShortcut}
                                            onOpenFolder={handleOpenFolder}
                                            isMergeTarget={mergeTargetId === shortcut.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </SortableContext>
            </div>

            <DragOverlay dropAnimation={DROP_ANIMATION}>
                {activeItem ? (
                    originContainerId === ROOT_CONTAINER ? (
                        <div
                            className="cursor-grabbing"
                            style={{ width: `${cellWidth}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                        >
                            <ShortcutTile
                                shortcut={activeItem}
                                iconSize={iconSize}
                                iconClassName={isMerging ? 'scale-90 opacity-80' : 'scale-105'}
                                titleClassName={isMerging ? 'opacity-0' : ''}
                                isContextOpen={false}
                            />
                        </div>
                    ) : (
                        <div className="p-2 cursor-grabbing">
                            <FolderItemTile shortcut={activeItem} />
                        </div>
                    )
                ) : null}
            </DragOverlay>

            {/* Fixed Pagination Controls */}
            {totalPages > 1 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 liquid-glass-fixed rounded-full px-4 py-2">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 0}
                        className={`p-1.5 rounded-full transition-all ${currentPage === 0
                            ? 'opacity-30 cursor-not-allowed'
                            : 'liquid-glass-mini hover:scale-110 text-white active:scale-90'
                            }`}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToPage(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentPage
                                    ? 'bg-white/90 shadow-lg shadow-white/25 w-6'
                                    : 'bg-white/40 hover:bg-white/70 hover:shadow-md hover:shadow-white/20 w-2'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages - 1}
                        className={`p-1.5 rounded-full transition-all ${currentPage === totalPages - 1
                            ? 'opacity-30 cursor-not-allowed'
                            : 'liquid-glass-mini hover:scale-110 text-white active:scale-90'
                            }`}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            <EditShortcutModal
                key={editingShortcut?.id || 'closed'}
                isOpen={!!editingShortcut}
                onClose={() => setEditingShortcut(null)}
                shortcut={editingShortcut}
                onSave={(updated) => {
                    if (openFolder && openFolder.children?.some(c => c.id === updated.id)) {
                        const newChildren = openFolder.children.map(c => c.id === updated.id ? updated : c);
                        handleFolderUpdate({ ...openFolder, children: newChildren });
                    } else {
                        onEditShortcut?.(updated);
                    }
                    setEditingShortcut(null);
                }}
            />

            <FolderModal
                isOpen={isFolderModalOpen && openFolder != null}
                onClose={() => setIsFolderModalOpen(false)}
                folder={openFolder}
                onUpdate={handleFolderUpdate}
                onDelete={handleFolderDelete}
                onEditShortcut={setEditingShortcut}
            />
        </DndContext>
    );
};

export default ShortcutGrid;
