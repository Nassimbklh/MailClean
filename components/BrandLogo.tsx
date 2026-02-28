import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient";
  className?: string;
}

export default function BrandLogo({
  href = "/",
  showText = true,
  size = "md",
  variant = "default",
  className = ""
}: BrandLogoProps) {
  const sizes = {
    sm: { image: 32, text: "text-lg" },
    md: { image: 40, text: "text-xl" },
    lg: { image: 48, text: "text-2xl" },
  };

  const textClasses = variant === "gradient"
    ? "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
    : "text-gray-900 dark:text-white";

  const content = (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="CleanMail"
        width={sizes[size].image}
        height={sizes[size].image}
        className="rounded-lg"
        priority
      />
      {showText && (
        <h1 className={`${sizes[size].text} font-bold ${textClasses}`}>
          CleanMail
        </h1>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
