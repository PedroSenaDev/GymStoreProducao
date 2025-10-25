import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ColorPickerInputProps {
  value: string[];
  onChange: (colors: string[]) => void;
}

export default function ColorPickerInput({ value = [], onChange }: ColorPickerInputProps) {
  const [currentColor, setCurrentColor] = useState('#000000');

  const handleAddColor = () => {
    if (currentColor && !value.includes(currentColor)) {
      onChange([...value, currentColor]);
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    onChange(value.filter(color => color !== colorToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          className="p-1 h-10 w-14 cursor-pointer"
          aria-label="Seletor de Cor"
        />
        <Input
          type="text"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
        <Button type="button" onClick={handleAddColor}>Adicionar</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {value.map((color) => (
          <div
            key={color}
            className="relative flex items-center gap-2 rounded-full border py-1 pl-2 pr-3"
          >
            <div
              className="h-6 w-6 rounded-full border"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-mono">{color.toUpperCase()}</span>
            <button
              type="button"
              onClick={() => handleRemoveColor(color)}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform hover:scale-110"
              aria-label={`Remover cor ${color}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}