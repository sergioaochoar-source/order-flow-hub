import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Error Loading Data",
  message,
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert className="max-w-lg border-destructive bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <AlertTitle className="text-lg font-semibold">{title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-muted-foreground mb-4">{message}</p>
          {onRetry && (
            <Button variant="outline" className="gap-2" onClick={onRetry}>
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
