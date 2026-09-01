import { useGameThumbnail } from "@/hooks/useGameThumbnail";
import { Gamepad2 } from "lucide-react";

interface GameThumbnailProps {
  gameName: string;
  universeId?: number | null;
  /** Custom thumbnail URL — when provided, overrides the Roblox auto-fetch. */
  customUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8 rounded-md",
  md: "w-12 h-12 rounded-lg",
  lg: "w-20 h-20 rounded-xl",
};

export function GameThumbnail({ gameName, universeId, customUrl, className = "", size = "sm" }: GameThumbnailProps) {
  // Skip the Roblox fetch entirely when admin uploaded a custom image.
  const fetched = useGameThumbnail(customUrl ? null : universeId);
  const thumbnail = customUrl || fetched;

  return thumbnail ? (
    <img
      src={thumbnail}
      alt={`${gameName} icon`}
      className={`${sizeMap[size]} object-cover shrink-0 ${className}`}
      loading="lazy"
      decoding="async"
      // @ts-ignore — fetchpriority is a valid HTML attr, types lag behind
      fetchpriority="low"
      width={size === "lg" ? 80 : size === "md" ? 48 : 32}
      height={size === "lg" ? 80 : size === "md" ? 48 : 32}
    />
  ) : (
    <div className={`${sizeMap[size]} bg-secondary flex items-center justify-center shrink-0 ${className}`}>
      <Gamepad2 className="w-1/2 h-1/2 text-muted-foreground" />
    </div>
  );
}
