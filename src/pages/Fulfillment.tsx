import { FulfillmentBoard } from '@/components/fulfillment/FulfillmentBoard';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Fulfillment() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fulfillment Board</h1>
            <p className="text-muted-foreground">Drag and drop orders between stages</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders..." 
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 p-6 overflow-hidden">
        <FulfillmentBoard />
      </div>
    </div>
  );
}
