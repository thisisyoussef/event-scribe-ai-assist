import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | undefined>(
    options.find(option => option.value === value)
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedOption(options.find(option => option.value === value));
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    setSelectedOption(option);
    onChange(option.value);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={cn(
          "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-left",
          "focus:outline-none focus:ring-2 focus:ring-[#5c5b2f] focus:border-[#5c5b2f]",
          "hover:border-gray-400 transition-colors duration-200 cursor-pointer",
          "flex items-center justify-between",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50"
        )}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={cn(
                "w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors duration-150",
                "flex items-center justify-between",
                option.value === value && "bg-[#5c5b2f] text-white hover:bg-[#4a4a28]"
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
