import { Link } from "react-router-dom";
import { Button, EmptyState } from "@ui";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or you don't have access to it."
        action={
          <Link to="/">
            <Button>Go home</Button>
          </Link>
        }
      />
    </div>
  );
}