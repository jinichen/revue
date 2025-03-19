/**
 * Revenue card component for displaying summary data
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RevenueCardProps {
  /**
   * Title of the card
   */
  title: string;
  /**
   * Period type this card represents (year, month, day)
   */
  period: 'year' | 'month' | 'day';
  /**
   * Total value to display
   */
  total: number;
  /**
   * Change percentage
   */
  changePercentage: number;
  /**
   * Whether this card is selected
   */
  isSelected?: boolean;
  /**
   * Click handler for card selection
   */
  onClick?: () => void;
}

/**
 * Card component showing call statistics with period selection capability
 */
export const RevenueCard = ({
  title,
  period,
  total,
  changePercentage,
  isSelected = false,
  onClick
}: RevenueCardProps) => {
  const formatTotal = () => {
    // Ensure total is a number before calling toLocaleString
    return (total || 0).toLocaleString();
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all cursor-pointer",
        isSelected && "ring-2 ring-primary shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatTotal()}</div>
      </CardContent>
    </Card>
  );
};