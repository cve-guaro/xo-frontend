// components/AnimatedList.web.tsx
import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, useInView } from 'motion/react';

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter: () => void;
  onClick: () => void;
  itemClassName?: string;
}

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick, itemClassName }: AnimatedItemProps) => {
  const ref = useRef(null);
  // amount: 0.2 means it starts animating when 20% is in view
  const inView = useInView(ref, { amount: 0.2, once: false });
  
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ 
        duration: 0.15,
        delay 
      }}
      className={`item-wrapper`}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  refreshControl?: ReactNode; // Ignored on web
}

export default function AnimatedList<T>({
  items = [],
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  refreshControl
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  // Lazy load/inject styling on mount for web to avoid render-blocking CSS files
  useEffect(() => {
    const id = 'animated-list-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
        .scroll-list-container {
          position: relative;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .scroll-list {
          max-height: 100%;
          overflow-y: auto;
          padding: 16px;
          flex: 1;
          min-height: 0;
        }
        .scroll-list::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-list::-webkit-scrollbar-thumb {
          background: rgba(166, 140, 255, 0.2);
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .item {
          padding: 12px;
          background-color: rgba(23, 23, 50, 0.4);
          border-radius: 12px;
          margin-bottom: 0.75rem;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .item.selected {
          background-color: rgba(166, 140, 255, 0.08);
          border-color: rgba(166, 140, 255, 0.3);
        }
        .item-text {
          color: white;
          margin: 0;
          font-size: 14px;
        }
        .top-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(to bottom, #050510, transparent);
          pointer-events: none;
          z-index: 10;
          transition: opacity 0.3s ease;
        }
        .bottom-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: linear-gradient(to top, #050510, transparent);
          pointer-events: none;
          z-index: 10;
          transition: opacity 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: T, index: number) => {
      setSelectedIndex(index);
      if (onItemSelect) {
        onItemSelect(item, index);
      }
    },
    [onItemSelect]
  );

  const handleScroll = useCallback((e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Show top gradient if scrolled down
    setTopGradientOpacity(Math.min(scrollTop / 40, 1));
    // Show bottom gradient if there's more to scroll
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 40, 1));
  }, []);

  // Initialize gradients
  useEffect(() => {
    if (listRef.current) {
      handleScroll({ target: listRef.current });
    }
  }, [items, handleScroll]);

  // Arrow Navigation
  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  // Scroll into view on keyboard nav
  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedItem) {
      const extraMargin = 40;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth'
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  return (
    <div className={`scroll-list-container ${className}`}>
      {showGradients && (
        <div className="top-gradient" style={{ opacity: topGradientOpacity }}></div>
      )}
      
      <div 
        ref={listRef} 
        className={`scroll-list ${!displayScrollbar ? 'no-scrollbar' : ''}`} 
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            delay={0.05}
            index={index}
            onMouseEnter={() => handleItemMouseEnter(index)}
            onClick={() => handleItemClick(item, index)}
          >
            <div className={`item ${selectedIndex === index ? 'selected' : ''} ${itemClassName}`}>
              {renderItem(item, index, selectedIndex === index)}
            </div>
          </AnimatedItem>
        ))}
      </div>

      {showGradients && (
        <div className="bottom-gradient" style={{ opacity: bottomGradientOpacity }}></div>
      )}
    </div>
  );
}
