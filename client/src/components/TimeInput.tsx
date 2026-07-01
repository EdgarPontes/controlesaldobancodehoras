import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface TimeInputProps {
  label?: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Component for inputting time in HH:MM format
 * Validates and formats the input automatically
 */
export function TimeInput({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "HH:MM",
}: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState(value || "");

  useEffect(() => {
    setDisplayValue(value || "");
  }, [value]);

  const formatTime = (input: string): string => {
    // Remove non-digits
    const digits = input.replace(/\D/g, "");

    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  };

  const isValidTime = (time: string): boolean => {
    if (!time) return true; // Empty is valid
    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) return false;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatTime(input);
    setDisplayValue(formatted);

    if (isValidTime(formatted)) {
      onChange?.(formatted || null);
    }
  };

  const handleBlur = () => {
    if (displayValue && !isValidTime(displayValue)) {
      setDisplayValue("");
      onChange?.(null);
    }
  };

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs font-medium">{label}</Label>}
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={5}
        className="font-mono text-center"
      />
    </div>
  );
}
