import { getStockReportAction } from "@/app/actions/stock.actions";
import { StockView } from "@/components/app/StockView";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const { stockReport, totalValuation, totalInStockKg, movements } =
    await getStockReportAction();

  return (
    <StockView
      initialReport={stockReport}
      initialValuation={totalValuation}
      initialInStockKg={totalInStockKg}
      initialMovements={movements}
    />
  );
}
