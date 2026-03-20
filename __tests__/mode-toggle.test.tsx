import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { ModeToggle } from '../components/mode-toggle';
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});


describe('ModeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });


  afterEach(() => cleanup());


  const renderToggle = () => {
    return render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ModeToggle />
      </ThemeProvider>
    );
  };


  it('shows toggle button and cycles themes, persists after reload', async () => {
    const { unmount } = renderToggle();


    const toggle = await screen.findByRole('button');
    expect(toggle).toBeDefined();
    expect(document.documentElement.classList.contains('dark')).toBe(false);


    // light -> dark
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    expect(localStorage.getItem('theme')).toBe('dark');


    // dark -> light
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    expect(localStorage.getItem('theme')).toBe('light');


    // refresh semantics: persist dark
    unmount();
    localStorage.setItem('theme', 'dark');


    renderToggle();
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
