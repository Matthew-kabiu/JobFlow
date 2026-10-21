import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <a
        href="/"
        className="mt-6 text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
      >
        Go home
      </a>
    </div>
  );
};

export default NotFound;
