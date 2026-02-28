"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

interface PublicNavbarProps {
  showLogin?: boolean;
  onLoginClick?: () => void;
  isLoggingIn?: boolean;
}

export default function PublicNavbar({
  showLogin = true,
  onLoginClick,
  isLoggingIn = false
}: PublicNavbarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    const baseClass = "font-medium transition-colors";
    if (isActive(path)) {
      return `${baseClass} text-blue-600 dark:text-blue-400`;
    }
    return `${baseClass} text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400`;
  };

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center">
          {/* Logo */}
          <BrandLogo href="/" size="lg" variant="gradient" />

          {/* Navigation au centre */}
          <div className="flex-1 flex justify-center items-center space-x-8">
            <Link href="/" className={navLinkClass("/")}>
              Accueil
            </Link>
            <Link href="/pricing" className={navLinkClass("/pricing")}>
              Tarifs
            </Link>
            <Link href="/contact" className={navLinkClass("/contact")}>
              Contact
            </Link>
          </div>

          {/* Actions à droite */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            {showLogin && (
              <button
                onClick={onLoginClick}
                disabled={isLoggingIn}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connexion...</span>
                  </>
                ) : (
                  <span>Connexion</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
