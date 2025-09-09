import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function DateField({ label, value, onChange, placeholder, required = false }: DateFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(' ', '-')} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={label.toLowerCase().replace(' ', '-')}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={`input-${label.toLowerCase().replace(' ', '-')}`}
      />
    </div>
  );
}
