import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { useIconSource } from '../hooks/useIconSource';
import EditShortcutModal from './EditShortcutModal';
import FolderIcon from './FolderIcon';
import FolderModal from './FolderModal';
import {
    DndContext,
    closestCenter,
    rectIntersection,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const createFolderId = () => `folder-${Date.now()}`;

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
                        onPointerDown={(e) => e.stopPropagation()}
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
                            onPointerDown={(e) => e.stopPropagation()}
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
    if (props.shortcut.type === 'folder') {
        return <FolderIcon folder={props.shortcut} iconSize={props.iconSize} />;
    }
    return <WebsiteShortcutIcon {...props} />;
};

const SortableShortcutItem = ({ 
    shortcut, 
    iconSize, 
    contextShortcutId, 
    setContextShortcutId, 
    onRemoveShortcut, 
    setEditingShortcut,
    onOpenFolder,
    isMergeTarget
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: shortcut.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0 : 1,
    };

    return (
        <div
            data-shortcut-id={shortcut.id}
            ref={setNodeRef}
            style={{ ...style, width: `${Math.max(iconSize + 40, 120)}px` }}
            {...attributes}
            {...listeners}
            className="group relative flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105 hover:z-10 justify-self-center h-fit touch-none"
            onClick={() => {
                if (isDragging) return;
                if (contextShortcutId === shortcut.id) return;
                
                if (shortcut.type === 'folder') {
                    onOpenFolder(shortcut);
                } else {
                    window.location.href = shortcut.url;
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextShortcutId(shortcut.id);
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    if (shortcut.type === 'folder') {
                        onOpenFolder(shortcut);
                    } else {
                        window.location.href = shortcut.url;
                    }
                }
            }}
        >
            <div className="relative">
                <ShortcutIcon 
                    shortcut={shortcut} 
                    iconSize={iconSize} 
                    isContextOpen={contextShortcutId === shortcut.id}
                    onRemove={onRemoveShortcut}
                    onEdit={setEditingShortcut}
                    setContextShortcutId={setContextShortcutId}
                />
                {isMergeTarget && (
                    <div 
                        className="absolute -inset-2 border-2 border-dashed border-white/50 rounded-[28px] pointer-events-none animate-pulse bg-white/10"
                        style={{ zIndex: 60 }}
                    />
                )}
            </div>
            <span className="text-sm font-medium text-white/90 drop-shadow-md truncate text-center px-1 select-none" style={{ width: '100%' }}>
                {shortcut.title}
            </span>
        </div>
    );
};

const ShortcutGrid = ({ config, shortcuts, onRemoveShortcut, onEditShortcut, onReorder, leftOffset = 0 }) => {
    const { cols = 5, rows = 3, iconSize = 96 } = config || {};
    const [currentPage, setCurrentPage] = useState(0);
    const [contextShortcutId, setContextShortcutId] = useState(null);
    const [editingShortcut, setEditingShortcut] = useState(null);
    const [responsiveCols, setResponsiveCols] = useState(cols);
    const [activeId, setActiveId] = useState(null);
    const [openFolder, setOpenFolder] = useState(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [mergeTargetId, setMergeTargetId] = useState(null);
    const mergeTimerRef = useRef(null);
    const dragOutTimerRef = useRef(null);
    const lastOverIdRef = useRef(null);
    const lastOverIndexRef = useRef(null);
    const lastCollisionTypeRef = useRef(null);

    const containerRef = useRef(null);
    const accumulatedRef = useRef(0);
    const lastTimeRef = useRef(0);
    const isChangingRef = useRef(false);

    const { colGap, rowGap } = calculateGaps(responsiveCols, rows);
    const [scale, setScale] = useState(1);

    // Custom collision detection strategy
    const collisionDetectionStrategy = useCallback((args) => {
        // 1. Check for overlap (rectIntersection)
        const overlapCollisions = rectIntersection(args);
        
        if (overlapCollisions.length > 0) {
            lastCollisionTypeRef.current = 'overlap';
            return overlapCollisions;
        }

        // 2. Fallback to proximity (closestCenter)
        lastCollisionTypeRef.current = 'proximity';
        return closestCenter(args);
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const findShortcut = (id) => {
        const shortcut = shortcuts.find(s => s.id === id);
        if (shortcut) return { shortcut, container: 'root', index: shortcuts.indexOf(shortcut) };
        
        for (const s of shortcuts) {
            if (s.type === 'folder' && s.children) {
                const child = s.children.find(c => c.id === id);
                if (child) return { shortcut: child, container: s.id, parent: s, index: s.children.indexOf(child) };
            }
        }
        return null;
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        
        // Handle drag out of folder
        const activeNode = findShortcut(active.id);
        if (activeNode && activeNode.container !== 'root') {
            // If dragging a folder item
            if (over && over.id === 'folder-modal-outside') {
                // Dragged out of folder!
                if (!dragOutTimerRef.current) {
                    dragOutTimerRef.current = setTimeout(() => {
                        const folderId = activeNode.container;
                        const folder = activeNode.parent;
                        const item = activeNode.shortcut;
                        
                        // Remove from folder
                        const newChildren = folder.children.filter(c => c.id !== item.id);
                        const updatedFolder = { ...folder, children: newChildren };
                        
                        // Insert item into shortcuts (after the folder)
                        const folderIndex = shortcuts.findIndex(s => s.id === folderId);
                        const newShortcuts = [...shortcuts];
                        
                        if (newChildren.length === 0) {
                            // Folder empty, replace with item
                            newShortcuts.splice(folderIndex, 1, item);
                            setOpenFolder(null);
                            setIsFolderModalOpen(false);
                        } else {
                            newShortcuts[folderIndex] = updatedFolder;
                            newShortcuts.splice(folderIndex + 1, 0, item);
                            setOpenFolder(updatedFolder);
                            setIsFolderModalOpen(false); // Close modal to allow sorting on grid
                        }
                        
                        if (onReorder) onReorder(newShortcuts);
                        dragOutTimerRef.current = null;
                    }, 400);
                }
                return;
            } else {
                if (dragOutTimerRef.current) {
                    clearTimeout(dragOutTimerRef.current);
                    dragOutTimerRef.current = null;
                }
            }
        }

        if (!over || active.id === over.id) {
            if (mergeTimerRef.current) {
                clearTimeout(mergeTimerRef.current);
                mergeTimerRef.current = null;
            }
            setMergeTargetId(null);
            lastOverIdRef.current = null;
            lastOverIndexRef.current = null;
            return;
        }

        const currentIndex = over.data?.current?.sortable?.index ?? null;

        // If over ID hasn't changed, only continue merge timer if index is stable
        if (lastOverIdRef.current === over.id) {
            // If we lost overlap (moved to proximity only), cancel merge
            if (lastCollisionTypeRef.current !== 'overlap') {
                if (mergeTimerRef.current) {
                    clearTimeout(mergeTimerRef.current);
                    mergeTimerRef.current = null;
                }
                setMergeTargetId(null);
                return;
            }

            if (lastOverIndexRef.current !== null && currentIndex !== lastOverIndexRef.current) {
                // Break merge when positions swap
                if (mergeTimerRef.current) {
                    clearTimeout(mergeTimerRef.current);
                    mergeTimerRef.current = null;
                }
                setMergeTargetId(null);
            }
            lastOverIndexRef.current = currentIndex;
            return;
        }
        
        // Over ID changed, reset timer
        lastOverIdRef.current = over.id;
        lastOverIndexRef.current = currentIndex;

        if (mergeTimerRef.current) {
            clearTimeout(mergeTimerRef.current);
            mergeTimerRef.current = null;
        }
        
        setMergeTargetId(null);

        const activeShortcut = shortcuts.find(s => s.id === active.id);
        const overShortcut = shortcuts.find(s => s.id === over.id);

        if (!activeShortcut || !overShortcut) {
            return;
        }

        // Don't allow dragging folders into folders
        if (activeShortcut.type === 'folder') {
            return;
        }

        // Check if valid merge target
        const isOverFolder = overShortcut.type === 'folder';
        const isOverItem = activeShortcut.type !== 'folder' && overShortcut.type !== 'folder';

        // Only allow merge if we have strict overlap
        if ((isOverFolder || isOverItem) && lastCollisionTypeRef.current === 'overlap') {
            mergeTimerRef.current = setTimeout(() => {
                setMergeTargetId(over.id);
            }, 600);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        if (mergeTimerRef.current) {
            clearTimeout(mergeTimerRef.current);
            mergeTimerRef.current = null;
        }

        if (dragOutTimerRef.current) {
            clearTimeout(dragOutTimerRef.current);
            dragOutTimerRef.current = null;
        }

        setActiveId(null);
        
        const isMergeAction = mergeTargetId && over && mergeTargetId === over.id;
        setMergeTargetId(null);

        if (!over) return;

        if (isMergeAction) {
            const activeShortcut = shortcuts.find(s => s.id === active.id);
            const overShortcut = shortcuts.find(s => s.id === over.id);

            // If dropping onto a folder
            if (overShortcut && overShortcut.type === 'folder') {
                // Don't allow dropping a folder into a folder for now
                if (activeShortcut.type === 'folder') return;

                const updatedFolder = {
                    ...overShortcut,
                    children: [...(overShortcut.children || []), activeShortcut]
                };
                
                const newShortcuts = shortcuts
                    .filter(s => s.id !== active.id)
                    .map(s => s.id === over.id ? updatedFolder : s);
                
                if (onReorder) onReorder(newShortcuts);
                return;
            }

            // If dropping onto another item to create a folder
            if (activeShortcut && overShortcut && activeShortcut.type !== 'folder' && overShortcut.type !== 'folder') {
                // Create new folder
                const newFolder = {
                    id: createFolderId(),
                    title: 'Folder',
                    type: 'folder',
                    children: [overShortcut, activeShortcut]
                };

                const newShortcuts = shortcuts
                    .filter(s => s.id !== active.id)
                    .map(s => s.id === over.id ? newFolder : s);
                
                if (onReorder) onReorder(newShortcuts);
                return;
            }
        }

        // Standard reordering
        if (active.id !== over.id) {
            // Check if reordering inside a folder
            const activeNode = findShortcut(active.id);
            const overNode = findShortcut(over.id);

            if (activeNode && overNode && activeNode.container === overNode.container && activeNode.container !== 'root') {
                const folder = activeNode.parent;
                const oldIndex = activeNode.index;
                const newIndex = overNode.index;
                
                if (oldIndex !== newIndex) {
                    const newChildren = arrayMove(folder.children, oldIndex, newIndex);
                    handleFolderUpdate({ ...folder, children: newChildren });
                }
                return;
            }

            const oldIndex = shortcuts.findIndex((s) => s.id === active.id);
            const newIndex = shortcuts.findIndex((s) => s.id === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
                onReorder(arrayMove(shortcuts, oldIndex, newIndex));
            }
        }
    };

    const handleFolderUpdate = (updatedFolder) => {
        if (updatedFolder.children.length === 0) {
            if (onRemoveShortcut) {
                onRemoveShortcut(updatedFolder.id);
            }
            setOpenFolder(null);
            setIsFolderModalOpen(false);
        } else {
            const newShortcuts = shortcuts.map(s => s.id === updatedFolder.id ? updatedFolder : s);
            if (onReorder) onReorder(newShortcuts);
            if (openFolder && openFolder.id === updatedFolder.id) {
                setOpenFolder(updatedFolder);
            }
        }
    };

    const handleFolderDelete = () => {
        // Delete folder and move items back to root? Or just delete everything?
        // Let's move items back to root for safety, or just delete.
        // User probably expects delete to delete.
        if (openFolder && onRemoveShortcut) {
            onRemoveShortcut(openFolder.id);
            setOpenFolder(null);
            setIsFolderModalOpen(false);
        }
    };

    const handleOpenFolder = (folder) => {
        setOpenFolder(folder);
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

    const itemsPerPage = responsiveCols * rows;
    const totalPages = Math.ceil(shortcuts.length / itemsPerPage);

    // Get all pages of shortcuts
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
        const start = i * itemsPerPage;
        pages.push(shortcuts.slice(start, start + itemsPerPage));
    }

    // Reset page when shortcuts change
    useEffect(() => {
        if (currentPage >= totalPages && totalPages > 0) {
            const frame = requestAnimationFrame(() => setCurrentPage(totalPages - 1));
            return () => cancelAnimationFrame(frame);
        }
    }, [shortcuts.length, totalPages, currentPage]);

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

    // Snap to page
    const goToPage = useCallback((targetPage) => {
        const clampedPage = Math.max(0, Math.min(totalPages - 1, targetPage));
        if (clampedPage !== currentPage) {
            isChangingRef.current = true;
            setCurrentPage(clampedPage);
            // Allow next page change after animation
            setTimeout(() => {
                isChangingRef.current = false;
                accumulatedRef.current = 0;
            }, 600);
        }
    }, [totalPages, currentPage]);

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

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetectionStrategy}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            {/* Swipeable Container */}
            <div
                ref={containerRef}
                className="w-full overflow-x-hidden"
            >
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
                            <SortableContext 
                                items={pageShortcuts.map(s => s.id)} 
                                strategy={rectSortingStrategy}
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
                                            contextShortcutId={contextShortcutId}
                                            setContextShortcutId={setContextShortcutId}
                                            onRemoveShortcut={onRemoveShortcut}
                                            setEditingShortcut={setEditingShortcut}
                                            onOpenFolder={handleOpenFolder}
                                            isMergeTarget={mergeTargetId === shortcut.id}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    ))}
                </div>
            </div>

            <DragOverlay>
                {activeId ? (
                    <div style={{ transform: 'scale(1.05)' }}>
                         {(() => {
                             const node = findShortcut(activeId);
                             const shortcut = node ? node.shortcut : null;
                             if (!shortcut) return null;
                             return (
                                 <div className="flex flex-col items-center gap-3">
                                     <ShortcutIcon 
                                         shortcut={shortcut} 
                                         iconSize={iconSize} 
                                         isContextOpen={false}
                                     />
                                     <span className="text-sm font-medium text-white/90 drop-shadow-md truncate w-full text-center px-1 select-none">
                                         {shortcut.title}
                                     </span>
                                 </div>
                             )
                         })()}
                    </div>
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
                        const updatedFolder = { ...openFolder, children: newChildren };
                        handleFolderUpdate(updatedFolder);
                    } else {
                        onEditShortcut?.(updated);
                    }
                    setEditingShortcut(null);
                }}
            />

            <FolderModal
                isOpen={isFolderModalOpen}
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
