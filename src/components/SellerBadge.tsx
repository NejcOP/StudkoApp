import { CheckCircle2, Award, Star } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface SellerBadgeProps {
  isVerified: boolean;
  totalSales: number;
  averageRating: number;
  size?: "sm" | "md" | "lg";
}

export function SellerBadge({ isVerified, totalSales, averageRating, size = "md" }: SellerBadgeProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  const badgeSize = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base";

  if (!isVerified && totalSales === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isVerified && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="default" 
                className={`${badgeSize} bg-gradient-to-r from-primary to-accent text-white border-0 shadow-lg hover:shadow-glow-primary transition-all duration-300`}
              >
                <CheckCircle2 className={`${iconSize} mr-1`} />
                Preverjeni prodajalec
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold mb-1">Preverjeni prodajalec</p>
              <ul className="text-xs space-y-1">
                <li>✓ 10+ prodaj</li>
                <li>✓ Povprečna ocena 4.5+</li>
                <li>✓ 3+ objavljenih zapiskov</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {totalSales > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className={`${badgeSize} bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700`}
              >
                <Award className={`${iconSize} mr-1`} />
                {totalSales} {totalSales === 1 ? 'prodaja' : totalSales === 2 ? 'prodaji' : 'prodaj'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Skupno število prodanih zapiskov</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {averageRating > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className={`${badgeSize} bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800`}
              >
                <Star className={`${iconSize} mr-1 fill-current`} />
                {averageRating.toFixed(1)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Povprečna ocena prodajalca</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
