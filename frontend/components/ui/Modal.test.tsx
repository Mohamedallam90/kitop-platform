import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal Component', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    // Reset mock function
    mockOnClose.mockClear();
    
    // Mock document.body.style to avoid test errors
    Object.defineProperty(document.body, 'style', {
      value: {
        overflow: '',
      },
      writable: true,
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when clicking the close button', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    // Find the backdrop div (the first div with fixed inset-0)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    fireEvent.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('applies different size classes based on size prop', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Small Modal" size="sm">
        <p>Modal content</p>
      </Modal>
    );
    
    let modalContent = screen.getByText('Small Modal').closest('.bg-white');
    expect(modalContent).toHaveClass('max-w-md');
    
    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title="Medium Modal" size="md">
        <p>Modal content</p>
      </Modal>
    );
    
    modalContent = screen.getByText('Medium Modal').closest('.bg-white');
    expect(modalContent).toHaveClass('max-w-lg');
    
    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title="Large Modal" size="lg">
        <p>Modal content</p>
      </Modal>
    );
    
    modalContent = screen.getByText('Large Modal').closest('.bg-white');
    expect(modalContent).toHaveClass('max-w-2xl');
    
    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title="Extra Large Modal" size="xl">
        <p>Modal content</p>
      </Modal>
    );
    
    modalContent = screen.getByText('Extra Large Modal').closest('.bg-white');
    expect(modalContent).toHaveClass('max-w-4xl');
  });

  it('sets document.body.style.overflow to hidden when modal is open', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('resets document.body.style.overflow when modal is closed', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    unmount();
    
    expect(document.body.style.overflow).toBe('unset');
  });

  it('renders without title when not provided', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    // Should not have a header section
    expect(document.querySelector('.border-b')).not.toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });
});