import { AlertTriangle, Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface ApiNotConfiguredProps {
  title?: string;
  description?: string;
}

export function ApiNotConfigured({ 
  title = "API Not Configured",
  description = "Please configure your API Base URL in Settings to connect to your backend."
}: ApiNotConfiguredProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert className="max-w-lg border-warning bg-warning/10">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-lg font-semibold">{title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-muted-foreground mb-4">{description}</p>
          <Link to="/settings">
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Go to Settings
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
}
