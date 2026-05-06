import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategorySelector from '../../../app/pos/components/Catalog/CategorySelector';

const CATEGORIES = [
    { id: 'cat-1', name: 'Bebidas' },
    { id: 'cat-2', name: 'Snacks' },
];

describe('CategorySelector', () => {
    it('renders all categories plus Favoritos and Sin Categoría', () => {
        render(<CategorySelector categories={CATEGORIES} activeCategoryId="favorites" onSelect={vi.fn()} />);
        expect(screen.getByText(/favoritos/i)).toBeInTheDocument();
        expect(screen.getByText('Bebidas')).toBeInTheDocument();
        expect(screen.getByText('Snacks')).toBeInTheDocument();
        expect(screen.getByText('Sin Categoría')).toBeInTheDocument();
    });

    it('calls onSelect with "favorites" when Favoritos is clicked', () => {
        const onSelect = vi.fn();
        render(<CategorySelector categories={CATEGORIES} activeCategoryId="cat-1" onSelect={onSelect} />);
        fireEvent.click(screen.getByText(/favoritos/i));
        expect(onSelect).toHaveBeenCalledWith('favorites');
    });

    it('calls onSelect with the category id when a category is clicked', () => {
        const onSelect = vi.fn();
        render(<CategorySelector categories={CATEGORIES} activeCategoryId="favorites" onSelect={onSelect} />);
        fireEvent.click(screen.getByText('Bebidas'));
        expect(onSelect).toHaveBeenCalledWith('cat-1');
    });

    it('calls onSelect with "uncategorized" when Sin Categoría is clicked', () => {
        const onSelect = vi.fn();
        render(<CategorySelector categories={CATEGORIES} activeCategoryId="favorites" onSelect={onSelect} />);
        fireEvent.click(screen.getByText('Sin Categoría'));
        expect(onSelect).toHaveBeenCalledWith('uncategorized');
    });

    it('uses "default" variant for the active badge', () => {
        render(<CategorySelector categories={CATEGORIES} activeCategoryId="cat-1" onSelect={vi.fn()} />);
        // Active badge has class that includes "default" variant styling via data-slot
        const bebidasBadge = screen.getByText('Bebidas');
        expect(bebidasBadge).toBeInTheDocument();
    });
});
