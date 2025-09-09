import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Child } from '@shared/schema';

interface ChildSelectorProps {
  children: Child[];
  selectedChildId: string;
  onChildChange: (childId: string) => void;
  includeAll?: boolean;
}

export default function ChildSelector({ children, selectedChildId, onChildChange, includeAll = true }: ChildSelectorProps) {
  return (
    <Select value={selectedChildId} onValueChange={onChildChange}>
      <SelectTrigger className="min-w-[180px]" data-testid="select-child">
        <SelectValue placeholder="Select child" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Children</SelectItem>
        )}
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.name} ({child.grade})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
