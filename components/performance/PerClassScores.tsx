import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClassScore } from "@/lib/metrics";
import { ChartCard } from "./ChartCard";

const AXIS = { fill: "#121212", fontSize: 12 };
const ROW_HEIGHT = 38;

export function PerClassScores({ scores }: { scores: ClassScore[] }) {
  return (
    <ChartCard title="Per-class scores">
      {/* Horizontal bars keep every class readable at phone width. */}
      <div
        className="h-(--chart-height) lg:h-full"
        style={{ "--chart-height": `${scores.length * ROW_HEIGHT + 58}px` } as CSSProperties}
      >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scores} layout="vertical" barGap={0} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E5E5E5" horizontal={false} />
          <XAxis type="number" domain={[0, 1]} tick={AXIS} stroke="#121212" />
          <YAxis type="category" dataKey="label" width={92} tick={AXIS} stroke="#121212" />
          <Tooltip cursor={{ fill: "#F7EDD8" }} />
          <Legend verticalAlign="top" height={32} itemSorter={null} wrapperStyle={{ fontSize: 14 }} formatter={(value) => <span className="text-black">{String(value)}</span>} />
          <Bar dataKey="precision" name="Precision" fill="#E3C07E" isAnimationActive={false} />
          <Bar dataKey="recall" name="Recall" fill="#B8893D" isAnimationActive={false} />
          <Bar dataKey="f1" name="F1" fill="#7A5A26" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
