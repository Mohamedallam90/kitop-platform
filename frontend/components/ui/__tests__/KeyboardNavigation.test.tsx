import React, { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useKeyboardNavigation, NavigableItem } from '../KeyboardNavigation';

// Test component using the hook
const TestNavigationComponent = ({ 
  orientation = 'vertical',
  loop = true,
  autoFocus = false,
  onNavigate = jest.fn(),
  onEscape = jest.fn(),
  onEnter = jest.fn()
}) => {
  const item1Ref = useRef<HTMLDivElement>(null);
  const item2Ref = useRef<HTMLDivElement>(null);
  const item3Ref = useRef<HTMLDivElement>(null);
  const item4Ref = useRef<HTMLDivElement>(null);
  
  const items = [item1Ref, item2Ref, item3Ref, item4Ref];
  
  const { containerRef, handleKeyDown } = useKeyboardNavigation(items, {
    orientation,
    loop,
    autoFocus,
    onNavigate,
    onEscape,
    onEnter
  });
  
  return (
    <div 
      ref={containerRef as React.RefObject<HTMLDivElement>} 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="container"
    >
      <div ref={item1Ref} tabIndex={0} data-testid="item-1">Item 1</div>
      <div ref={item2Ref} tabIndex={0} data-testid="item-2">Item 2</div>
      <div ref={item3Ref} tabIndex={0} data-testid="item-3" aria-disabled="true">Item 3 (Disabled)</div>
      <div ref={item4Ref} tabIndex={0} data-testid="item-4">Item 4</div>
    </div>
  );
};

describe('useKeyboardNavigation Hook', () => {
  it('handles vertical arrow key navigation', () => {
    const onNavigate = jest.fn();
    render(<TestNavigationComponent onNavigate={onNavigate} />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    // Navigate down
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(onNavigate).toHaveBeenCalled();
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Navigate down again
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-2');
    
    // Navigate down again (should skip disabled item)
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-4');
    
    // Navigate up
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-2');
  });
  
  it('handles horizontal arrow key navigation', () => {
    const onNavigate = jest.fn();
    render(<TestNavigationComponent orientation="horizontal" onNavigate={onNavigate} />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    // Navigate right
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(onNavigate).toHaveBeenCalled();
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Navigate right again
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-2');
    
    // Navigate left
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
  });
  
  it('handles looping navigation', () => {
    render(<TestNavigationComponent loop={true} />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    // Navigate to first item
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Navigate to last item
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-4');
    
    // Navigate past last item (should loop to first)
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
  });
  
  it('respects non-looping navigation', () => {
    render(<TestNavigationComponent loop={false} />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    // Navigate to first item
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Try to navigate before first item (should stay at first)
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Navigate to last item
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-4');
    
    // Try to navigate past last item (should stay at last)
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-4');
  });
  
  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = jest.fn();
    render(<TestNavigationComponent onEscape={onEscape} />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    fireEvent.keyDown(container, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
  
  it('calls onEnter when Enter key is pressed on an item', () => {
    const onEnter = jest.fn();
    render(<TestNavigationComponent onEnter={onEnter} />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    // Navigate to an item
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Press Enter
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
  
  it('supports Home/End navigation with Ctrl key', () => {
    render(<TestNavigationComponent />);
    
    const container = screen.getByTestId('container');
    container.focus();
    
    // Navigate to first item
    fireEvent.keyDown(container, { key: 'Home', ctrlKey: true });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-1');
    
    // Navigate to last item
    fireEvent.keyDown(container, { key: 'End', ctrlKey: true });
    expect(document.activeElement).toHaveAttribute('data-testid', 'item-4');
  });
});

describe('NavigableItem Component', () => {
  it('renders children correctly', () => {
    render(<NavigableItem>Click me</NavigableItem>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const onClick = jest.fn();
    render(<NavigableItem onClick={onClick}>Click me</NavigableItem>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  
  it('handles Enter key press as click', () => {
    const onClick = jest.fn();
    render(<NavigableItem onClick={onClick}>Press Enter</NavigableItem>);
    
    const item = screen.getByText('Press Enter');
    item.focus();
    fireEvent.keyDown(item, { key: 'Enter' });
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  
  it('handles Space key press as click', () => {
    const onClick = jest.fn();
    render(<NavigableItem onClick={onClick}>Press Space</NavigableItem>);
    
    const item = screen.getByText('Press Space');
    item.focus();
    fireEvent.keyDown(item, { key: ' ' });
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies disabled state correctly', () => {
    const onClick = jest.fn();
    render(<NavigableItem disabled onClick={onClick}>Disabled Item</NavigableItem>);
    
    const item = screen.getByText('Disabled Item');
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveClass('opacity-50');
    
    // Click should not trigger onClick when disabled
    fireEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });
  
  it('applies custom className', () => {
    render(<NavigableItem className="custom-class">Styled Item</NavigableItem>);
    
    const item = screen.getByText('Styled Item');
    expect(item).toHaveClass('custom-class');
  });
});