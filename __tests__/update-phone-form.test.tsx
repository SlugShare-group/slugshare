import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { UpdatePhoneForm } from "@/components/UpdatePhoneForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

describe("UpdatePhoneForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }) as unknown as Promise<Response>
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("cancels edit without saving, and resets to original value", async () => {
    render(<UpdatePhoneForm initialPhone="(123) 456-7890" />);

    const trigger = screen.getByRole("button", { name: /\(123\) 456-7890/ });
    fireEvent.click(trigger);

    const input = screen.getByPlaceholderText("(123) 456-7890") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "(111) 222-3333" } });

    const cancelButton = screen.getByRole("button", { name: /Cancel phone edit/i });
    fireEvent.click(cancelButton);

    expect(screen.getByRole("button", { name: /\(123\) 456-7890/ })).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks save with invalid phone and shows validation error", async () => {
    render(<UpdatePhoneForm initialPhone="(123) 456-7890" />);

    const trigger = screen.getByRole("button", { name: /\(123\) 456-7890/ });
    fireEvent.click(trigger);

    const input = screen.getByPlaceholderText("(123) 456-7890") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123" } });

    const saveButton = screen.getByRole("button", { name: /Save phone/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toBe("Invalid phone number.");
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});