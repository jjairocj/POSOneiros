import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks if needed
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));
