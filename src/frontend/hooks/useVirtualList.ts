import { useState, useRef, useMemo } from 'react';

export interface VirtualItem {
  index: number;
  offsetTop: number;
}

interface VirtualListOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualList({ itemCount, itemHeight, containerHeight, overscan = 5 }: VirtualListOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, items, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount);
    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i += 1) {
      items.push({ index: i, offsetTop: i * itemHeight });
    }
    return { startIndex, endIndex, items, totalHeight: itemCount * itemHeight };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    setScrollTop(e.currentTarget.scrollTop);
  }

  return { startIndex, endIndex, items, totalHeight, containerRef, onScroll };
}
