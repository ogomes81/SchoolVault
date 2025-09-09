import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface FiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  docTypeFilter: string;
  onDocTypeChange: (type: string) => void;
  dateFromFilter: string;
  onDateFromChange: (date: string) => void;
  dateToFilter: string;
  onDateToChange: (date: string) => void;
}

export default function Filters({
  searchQuery,
  onSearchChange,
  docTypeFilter,
  onDocTypeChange,
  dateFromFilter,
  onDateFromChange,
  dateToFilter,
  onDateToChange,
}: FiltersProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search documents, tags, or content..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap lg:flex-nowrap">
          <Select value={docTypeFilter} onValueChange={onDocTypeChange}>
            <SelectTrigger className="min-w-[140px]" data-testid="select-doc-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Homework">Homework</SelectItem>
              <SelectItem value="Permission Slip">Permission Slip</SelectItem>
              <SelectItem value="Flyer">Flyer</SelectItem>
              <SelectItem value="Report Card">Report Card</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            type="date"
            value={dateFromFilter}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="min-w-[140px]"
            data-testid="input-date-from"
          />
          
          <Input
            type="date"
            value={dateToFilter}
            onChange={(e) => onDateToChange(e.target.value)}
            className="min-w-[140px]"
            data-testid="input-date-to"
          />
        </div>
      </div>
    </div>
  );
}
