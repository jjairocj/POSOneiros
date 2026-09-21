import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const mockGet = vi.fn();
const mockSet = vi.fn();
vi.mock('../../app/actions/users', () => ({
    getMyTutorialMode: (...a: any[]) => mockGet(...a),
    setMyTutorialMode: (...a: any[]) => mockSet(...a),
}));
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

import { TutorialModeProvider, Hint, HintDialogDescription, useTutorialMode } from '../../app/components/TutorialMode';

function Toggle() {
    const { enabled, setEnabled } = useTutorialMode();
    return <button onClick={() => setEnabled(!enabled)}>toggle</button>;
}

const renderApp = () => render(
    <TutorialModeProvider>
        <Hint>ayuda del campo</Hint>
        <Toggle />
    </TutorialModeProvider>
);

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockGet.mockResolvedValue(false);
    mockSet.mockResolvedValue({ success: true });
});

describe('Modo Tutorial', () => {
    it('hides Hint text by default', async () => {
        renderApp();
        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        expect(screen.queryByText('ayuda del campo')).not.toBeInTheDocument();
    });

    it("shows Hint text when the user's saved preference is on", async () => {
        mockGet.mockResolvedValue(true);
        renderApp();
        expect(await screen.findByText('ayuda del campo')).toBeInTheDocument();
    });

    it('does not ask the server while unauthenticated', () => {
        mockUseSession.mockReturnValue({ status: 'unauthenticated' });
        renderApp();
        expect(mockGet).not.toHaveBeenCalled();
        expect(screen.queryByText('ayuda del campo')).not.toBeInTheDocument();
    });

    it('toggling shows the text immediately and saves it to the account', async () => {
        renderApp();
        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        await act(async () => { fireEvent.click(screen.getByText('toggle')); });
        expect(screen.getByText('ayuda del campo')).toBeInTheDocument();
        expect(mockSet).toHaveBeenCalledWith(true);
        expect(localStorage.getItem('oneiros-tutorial-mode')).toBe('true');
    });

    it('uses the cached value for first paint before the server answers', () => {
        localStorage.setItem('oneiros-tutorial-mode', 'true');
        mockGet.mockReturnValue(new Promise(() => {})); // never resolves
        renderApp();
        expect(screen.getByText('ayuda del campo')).toBeInTheDocument();
    });

    it('a dialog description stays in the DOM for screen readers but is only visible in tutorial mode', async () => {
        const dialog = (
            <TutorialModeProvider>
                <Dialog open>
                    <DialogContent>
                        <DialogTitle>Editar</DialogTitle>
                        <HintDialogDescription>Completa la información</HintDialogDescription>
                    </DialogContent>
                </Dialog>
            </TutorialModeProvider>
        );
        const { unmount } = render(dialog);
        await waitFor(() => expect(mockGet).toHaveBeenCalled());
        expect(screen.getByText('Completa la información')).toHaveClass('sr-only');
        unmount();

        mockGet.mockResolvedValue(true);
        render(dialog);
        await waitFor(() => expect(screen.getByText('Completa la información')).not.toHaveClass('sr-only'));
    });
});
