import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

interface TopNavbarProps {
  onMenuClick: () => void;
  showMenuButton: boolean;
}

const TopNavbar = ({ onMenuClick, showMenuButton }: TopNavbarProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 mx-auto max-w-md">
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-3">
        {/* Menu button (only on feed) */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        {/* Logo/Title */}
        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent flex-1">
          Dirajumla Publishers
        </h1>
        
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="shrink-0"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
};

export default TopNavbar;