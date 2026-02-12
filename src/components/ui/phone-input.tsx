import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
 

// Unique country calling codes (numbers only in the UI)
const COUNTRY_CODES: string[] = [
  "+1",
  "+20",
  "+33",
  "+44",
  "+61",
  "+91",
  "+92",
  "+880",
  "+963",
  "+966",
  "+967",
  "+971",
];

export type PhoneInputProps = {
  id?: string;
  value: string; // full phone string, may or may not include country code
  onChange: (value: string) => void; // emits full string with selected country code prefixed when possible
  placeholder?: string;
  className?: string;
  defaultCountryCode?: string; // e.g. +1
  disabled?: boolean;
};

// Very lightweight parser to split country code and national part
function splitPhone(value: string): { code: string; national: string } {
  const cleaned = (value || "").replace(/\s|\(|\)|-/g, "");
  if (!cleaned) return { code: "+1", national: "" };
  if (cleaned.startsWith("+")) {
    // Try to match the longest country code in our list
    const byLengthDesc = [...COUNTRY_CODES].sort((a, b) => b.length - a.length);
    for (const cc of byLengthDesc) {
      if (cleaned.startsWith(cc)) {
        return { code: cc, national: cleaned.slice(cc.length) };
      }
    }
    // Fallback: treat first + and next digits up to 4 as code
    const match = cleaned.match(/^(\+\d{1,4})(\d*)$/);
    if (match) return { code: match[1], national: match[2] };
    return { code: "+1", national: cleaned.replace(/^\+/, "") };
  }
  // No + present => treat as national part with default +1
  return { code: "+1", national: cleaned };
}

// Enhanced parser that handles autofill scenarios better
function parseAutofilledPhone(value: string, currentCode: string): { code: string; national: string } {
  const cleaned = (value || "").replace(/\s|\(|\)|-/g, "");
  if (!cleaned) return { code: currentCode, national: "" };
  
  // If it starts with +, use the existing logic
  if (cleaned.startsWith("+")) {
    return splitPhone(value);
  }
  
  // Handle autofill scenarios where the number might include the country code
  // Check if the number starts with the current country code (without +)
  const currentCodeDigits = currentCode.replace("+", "");
  if (cleaned.startsWith(currentCodeDigits)) {
    // Remove the country code from the beginning
    const nationalPart = cleaned.slice(currentCodeDigits.length);
    return { code: currentCode, national: nationalPart };
  }
  
  // Check if it looks like a US number (10 digits) and we're on +1
  if (currentCode === "+1" && /^\d{10}$/.test(cleaned)) {
    return { code: "+1", national: cleaned };
  }
  
  // Check if it looks like a US number with leading 1 (11 digits starting with 1)
  if (currentCode === "+1" && /^1\d{10}$/.test(cleaned)) {
    return { code: "+1", national: cleaned.slice(1) };
  }
  
  // Default: treat as national part
  return { code: currentCode, national: cleaned };
}

function combinePhone(code: string, national: string): string {
  const digits = (national || "").replace(/[^\d]/g, "");
  if (!digits) return code; // show just code until user types
  return `${code}${digits}`;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  className,
  defaultCountryCode = "+1",
  disabled,
}) => {
  const [customCodes, setCustomCodes] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [inputError, setInputError] = useState("");
  const ADD_CUSTOM_OPTION = "__add_custom_country_code__";
  
  const availableCodes = useMemo(() => {
    const set = new Set<string>([...COUNTRY_CODES, ...customCodes, defaultCountryCode]);
    return Array.from(set).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  }, [customCodes, defaultCountryCode]);

  const { code, national } = useMemo(() => {
    const initial = parseAutofilledPhone(value || defaultCountryCode, defaultCountryCode);
    // If value is just "+1", show empty national
    if (/^\+\d+$/.test(initial.national) === false) {
      /* no-op */
    }
    return initial;
  }, [value, defaultCountryCode]);

  const handleCodeChange = (newCode: string) => {
    const next = combinePhone(newCode, national);
    onChange(next);
  };

  const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Use the enhanced parser to handle autofill scenarios
    const parsed = parseAutofilledPhone(inputValue, code || defaultCountryCode);
    const next = combinePhone(parsed.code, parsed.national);
    onChange(next);
  };

  const handleAddCustomCode = () => {
    const trimmed = customCodeInput.trim();
    if (!trimmed) {
      setInputError("Please enter a country code");
      return;
    }
    
    // Auto-add + if user forgot it
    const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
    
    if (!/^\+\d{1,4}$/.test(withPlus)) {
      setInputError("Please enter a valid country code (e.g., +49, +86)");
      return;
    }
    if (availableCodes.includes(withPlus)) {
      setInputError("This country code is already available");
      return;
    }
    
    setCustomCodes((prev) => [...prev, withPlus]);
    setCustomCodeInput("");
    setInputError("");
    setIsDialogOpen(false);
    // Switch to the new code
    handleCodeChange(withPlus);
  };

  const handleDialogOpen = () => {
    setCustomCodeInput("");
    setInputError("");
    setIsDialogOpen(true);
  };

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-1">
        <Select
          value={code || defaultCountryCode}
          onValueChange={(newValue) => {
            if (newValue === ADD_CUSTOM_OPTION) {
              setIsDialogOpen(true);
              return;
            }
            handleCodeChange(newValue);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableCodes.map((cc) => (
              <SelectItem key={cc} value={cc}>
                {cc}
              </SelectItem>
            ))}
            <SelectItem value={ADD_CUSTOM_OPTION}>+ Add custom</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Country Code</DialogTitle>
              <DialogDescription>
                Enter a country calling code to add it to your list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="custom-code">Country Code</Label>
                <Input
                  id="custom-code"
                  value={customCodeInput}
                  onChange={(e) => {
                    setCustomCodeInput(e.target.value);
                    setInputError("");
                  }}
                  placeholder="e.g., +49, +86"
                  className={inputError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                {inputError && (
                  <p className="text-sm text-red-600">{inputError}</p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCustomCode}>
                  Add Code
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Input
        id={id}
        inputMode="tel"
        type="tel"
        value={national}
        onChange={handleNationalChange}
        placeholder={placeholder || "Phone number"}
        className={className}
        disabled={disabled}
        autoComplete="tel"
      />
    </div>
  );
};

export default PhoneInput;


