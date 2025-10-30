import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Color {
  code: string;
  name: string;
}

interface ColorNamePickerInputProps {
  value: Color[];
  onChange: (colors: Color[]) => void;
}

export default function ColorNamePickerInput({ value = [], onChange }: ColorNamePickerInputProps) {
  const [colorCode, setColorCode] = useState('#000000');
  const [colorName, setColorName] = useState('');

  const handleAddColor = () => {
    if (colorCode && colorName && !value.some(c => c.code === colorCode)) {
      onChange([...value, { code: colorCode, name: colorName }]);
      setColorName('');
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    onChange(value.filter(color => color.code !== colorToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          type="color"
          value={colorCode}
          onChange={(e) => setColorCode(e.target.value)}
          className="p-1 h-10 w-14 cursor-pointer"
          aria-label="Seletor de Cor"
        />
        <Input
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
          placeholder="Nome da cor (ex: Azul Marinho)"
          className="sm:col-span-2"
        />
      </div>
      <Button type="button" onClick={handleAddColor} className="w-full">Adicionar Cor</Button>
      <div className="flex flex-wrap gap-3">
        {value.map((color) => (
          <div
            key={color.code}
            className="relative flex items-center gap-2 rounded-full border py-1 pl-2 pr-3"
          >
            <div
              className="h-6 w-6 rounded-full border"
              style={{ backgroundColor: color.code }}
            />
            <span className="text-sm font-medium">{color.name}</span>
            <button
              type="button"
              onClick={() => handleRemoveColor(color.code)}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform hover:scale-110"
              aria-label={`Remover cor ${color.name}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}