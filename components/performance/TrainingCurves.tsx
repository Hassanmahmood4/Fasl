import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs } from "@/components/shared/Tabs";
import type { EpochMetrics } from "@/lib/metrics";
import { ChartCard } from "./ChartCard";

const METRICS = [
  { value: "acc", label: "Accuracy" },
  { value: "loss", label: "Loss" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

const AXIS = { fill: "#121212", fontSize: 12 };

export function TrainingCurves({ history }: { history: EpochMetrics[] }) {
  const [metric, setMetric] = useState<Metric>("acc");

  return (
    <ChartCard
      title="Training curves"
      controls={<Tabs label="Training metric" options={METRICS} value={metric} onChange={setMetric} />}
    >
      <div className="h-[250px] lg:h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="#E5E5E5" />
          <XAxis dataKey="epoch" tick={AXIS} stroke="#121212" label={{ value: "Epoch", position: "insideBottom", offset: -4, fill: "#121212", fontSize: 12 }} />
          <YAxis tick={AXIS} stroke="#121212" domain={metric === "acc" ? [0, 1] : [0, "auto"]} />
          <Tooltip labelFormatter={(epoch) => `Epoch ${String(epoch)}`} />
          <Legend verticalAlign="top" height={32} itemSorter={null} wrapperStyle={{ fontSize: 14 }} formatter={(value) => <span className="text-black">{String(value)}</span>} />
          <Line
            type="monotone"
            dataKey={`train_${metric}`}
            name="Training"
            stroke="#E3C07E"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey={`val_${metric}`}
            name="Validation"
            stroke="#B8893D"
            strokeWidth={3}
            strokeDasharray="6 5"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
