import { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import TopNavbar from "./TopNavbar";
import BottomNavbar from "./BottomNavbar";
import SideMenu from "./SideMenu";
import Feed from "@/pages/Feed";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const location = useLocation();
  
  // Only show side menu on feed page
  const showSideMenu = location.pathname === "/";
  const isFeedPage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile-first container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col shadow-lg relative">
        {/* Top Navbar */}
        <TopNavbar 
          onMenuClick={() => setIsSideMenuOpen(true)} 
          showMenuButton={showSideMenu} 
        />
        
        {/* Side Menu - only on feed */}
        {showSideMenu && (
          <>
            <div
              className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
                isSideMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setIsSideMenuOpen(false)}
            />
            <SideMenu 
              isOpen={isSideMenuOpen} 
              onClose={() => setIsSideMenuOpen(false)} 
              onCategorySelect={setSelectedCategory}
            />
          </>
        )}
        
        {/* Main Content */}
        <main className="flex-1 pb-20 pt-14 overflow-y-auto">
          {isFeedPage ? (
            <Feed selectedCategory={selectedCategory} />
          ) : (
            children
          )}
        </main>
        
        {/* Bottom Navbar */}
        <BottomNavbar />
      </div>
    </div>
  );
};

export default Layout;