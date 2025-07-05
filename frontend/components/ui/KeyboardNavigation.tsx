'use client';

import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';

export interface KeyboardNavigationOptions {
  loop?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'both';
  skipDisabled?: boolean;
  autoFocus?: boolean;
  onNavigate?: (index: number, element: HTMLElement) => void;
  onEscape?: () => void;
  onEnter?: (index: number, element: HTMLElement) => void;
}

export interface NavigableItemProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
  tabIndex?: number;
}

export const useKeyboardNavigation = (
  items: React.RefObject<HTMLElement>[],
  options: KeyboardNavigationOptions = {}
) => {
  const {
    loop = true,
    orientation = 'vertical',
    skipDisabled = true,
    onNavigate,
    onEscape,
    onEnter,
  } = options;

  const [currentIndex, setCurrentIndex] = useState(-1);
  const containerRef = useRef<HTMLElement>(null);

  const getEnabledItems = () => {
    return items.filter(item => {
      const element = item.current;
      return element && (!skipDisabled || !element.hasAttribute('disabled'));
    });
  };

  const moveFocus = (direction: 'next' | 'prev' | 'first' | 'last') => {
    const enabledItems = getEnabledItems();
    if (enabledItems.length === 0) return;

    let newIndex = currentIndex;

    switch (direction) {
      case 'next':
        newIndex = currentIndex + 1;
        if (newIndex >= enabledItems.length) {
          newIndex = loop ? 0 : enabledItems.length - 1;
        }
        break;
      case 'prev':
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? enabledItems.length - 1 : 0;
        }
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = enabledItems.length - 1;
        break;
    }

    const targetItem = enabledItems[newIndex];
    if (targetItem?.current) {
      targetItem.current.focus();
      setCurrentIndex(newIndex);
      onNavigate?.(newIndex, targetItem.current);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey } = event;

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          moveFocus('next');
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          moveFocus('prev');
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          moveFocus('next');
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          moveFocus('prev');
        }
        break;
      case 'Home':
        if (ctrlKey || metaKey) {
          event.preventDefault();
          moveFocus('first');
        }
        break;
      case 'End':
        if (ctrlKey || metaKey) {
          event.preventDefault();
          moveFocus('last');
        }
        break;
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
      case 'Enter':
      case ' ':
        if (currentIndex >= 0) {
          event.preventDefault();
          const enabledItems = getEnabledItems();
          const currentItem = enabledItems[currentIndex];
          if (currentItem?.current) {
            onEnter?.(currentIndex, currentItem.current);
            currentItem.current.click();
          }
        }
        break;
    }
  };

  // Auto-focus first item if enabled
  useEffect(() => {
    if (options.autoFocus && items.length > 0) {
      const firstEnabledItem = getEnabledItems()[0];
      if (firstEnabledItem?.current) {
        firstEnabledItem.current.focus();
        setCurrentIndex(0);
      }
    }
  }, [items, options.autoFocus]);

  return {
    containerRef,
    currentIndex,
    handleKeyDown,
    moveFocus,
    setCurrentIndex,
  };
};

const NavigableItem: React.FC<NavigableItemProps> = ({
  children,
  disabled = false,
  onClick,
  className = '',
  'data-testid': dataTestId,
  tabIndex = 0,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      ref={itemRef}
      className={`
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : tabIndex}
      role="button"
      aria-disabled={disabled}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
};

export interface AccessibleMenuProps {
  items: Array<{
    id: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
  }>;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  'aria-label'?: string;
  'data-testid'?: string;
}

export const AccessibleMenu: React.FC<AccessibleMenuProps> = ({
  items,
  className = '',
  orientation = 'vertical',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}) => {
  const itemRefs = useRef<Array<React.RefObject<HTMLElement>>>(
    items.map(() => React.createRef<HTMLElement>())
  );

  const { containerRef, handleKeyDown } = useKeyboardNavigation(itemRefs.current, {
    orientation,
    loop: true,
    skipDisabled: true,
    autoFocus: false,
  });

  const menuClassName = `
    ${orientation === 'horizontal' ? 'flex flex-row space-x-2' : 'flex flex-col space-y-1'}
    ${className}
  `;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={menuClassName}
      role="menu"
      aria-label={ariaLabel || 'Navigation menu'}
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      data-testid={dataTestId || 'accessible-menu'}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={itemRefs.current[index] as React.RefObject<HTMLDivElement>}
          className={`
            px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${item.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'
            }
          `}
          role="menuitem"
          tabIndex={item.disabled ? -1 : 0}
          aria-disabled={item.disabled}
          onClick={() => !item.disabled && item.onClick()}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !item.disabled) {
              event.preventDefault();
              item.onClick();
            }
          }}
          data-testid={`menu-item-${item.id}`}
        >
          <div className="flex items-center space-x-2">
            {item.icon && (
              <span aria-hidden="true" className="w-4 h-4">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export interface AccessibleTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
  }>;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const tabRefs = useRef<Array<React.RefObject<HTMLElement>>>(
    tabs.map(() => React.createRef<HTMLElement>())
  );

  const { containerRef, handleKeyDown } = useKeyboardNavigation(tabRefs.current, {
    orientation: 'horizontal',
    loop: true,
    skipDisabled: true,
    onEnter: (index) => {
      const tab = tabs[index];
      if (tab && !tab.disabled) {
        setActiveTab(tab.id);
        onChange?.(tab.id);
      }
    },
  });

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={className} data-testid={dataTestId || 'accessible-tabs'}>
      {/* Tab List */}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="flex border-b border-gray-200"
        role="tablist"
        aria-label={ariaLabel || 'Tab navigation'}
        onKeyDown={handleKeyDown}
        data-testid="tab-list"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={tabRefs.current[index] as React.RefObject<HTMLButtonElement>}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${tab.disabled
                ? 'text-gray-400 cursor-not-allowed border-transparent'
                : activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }
            `}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
            className={activeTab === tab.id ? 'focus:outline-none' : ''}
            data-testid={`panel-${tab.id}`}
          >
            {activeTab === tab.id && tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export { NavigableItem };