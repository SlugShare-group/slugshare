"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Check, Plus, Loader2, X } from "lucide-react";

export function UpdatePhoneForm({ initialPhone }: { initialPhone?: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  //helper fn to format as (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, ""); //strips non-numeric characters
    const length = phoneNumber.length;

    if (length < 4){
        return phoneNumber;
    }

    if (length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const [error, setError] = useState<string | null>(null);

  const validatePhone = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    return digits.length === 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePhone(phone)) {
      setError("Invalid phone number.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Failed to update phone number.");
        return;
      }

      setIsEditing(false);
      setError(null);
      router.refresh();
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update phone number.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
      >
        {phone ? phone : <><Plus className="h-3 w-3" /> Add phone number</>}
      </button>
    );
  }

  return (
    <form data-testid="update-phone-form" onSubmit={handleSubmit} className="flex items-center gap-1">
      <Input
        className="h-7 w-32 text-xs"
        value={phone}
        maxLength={14} //limit str length
        onChange={(e) => {
          setPhone(formatPhoneNumber(e.target.value));
          if (error) setError(null);
        }}
        placeholder="(123) 456-7890"
        autoFocus
        disabled={isLoading}
      />
      <Button aria-label="Save phone" size="icon" variant="ghost" className="h-7 w-7" disabled={isLoading} type="submit">
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
      </Button>
      <Button 
        aria-label="Cancel phone edit"
        size="icon" 
        variant="ghost" 
        className="h-7 w-7" 
        onClick={() => {
          setIsEditing(false);
          setPhone(initialPhone || ""); //reset og value on cancel
          setError(null);
        }}
        type="button"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </Button>
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>
      )}
    </form>
  );
}