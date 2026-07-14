import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { getThemeChartColors } from "../utils/theme";

export type DailyChartRow = {
  day: string;
  Услуги: number;
  Материалы: number;
  Солярий: number;
  Выручка: number;
};

export type MasterRevenueRow = {
  id: string;
  name: string;
  position: string;
  work: number;
  materials: number;
  total: number;
  count: number;
  percentage: number;
};

const MASTER_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#10b981",
  "#f97316",
  "#06b6d4",
  "#d946ef",
  "#8b5cf6",
  "#ef4444",
];

type ChartColors = ReturnType<typeof getThemeChartColors>;

export function RevenueDayChart({
  data,
  chartColors,
}: {
  data: DailyChartRow[];
  chartColors: ChartColors;
}) {
  return (
    <div className="h-[360px] w-full mt-4 font-sans min-w-0" id="revenue-chart-viewport">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={{ stroke: chartColors.grid }}
            tick={{ fontSize: 10, fill: chartColors.tick, fontWeight: "bold" }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: chartColors.grid }}
            tickFormatter={(v) => `${v.toLocaleString()} ₽`}
            tick={{ fontSize: 10, fill: chartColors.tick }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartColors.tooltipBg,
              color: chartColors.tooltipText,
              borderRadius: "16px",
              border: `1px solid ${chartColors.tooltipBorder}`,
              boxShadow:
                "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
              fontSize: "11px",
              padding: "12px",
            }}
            formatter={(value: any, name: any) => [`${value.toLocaleString()} ₽`, name]}
            labelFormatter={(label) => `Число месяца: ${label}`}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px", color: chartColors.tick }}
          />
          <Bar dataKey="Услуги" stackId="revenue" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={14} name="Услуги красоты" />
          <Bar dataKey="Материалы" stackId="revenue" fill="#ec4899" radius={[0, 0, 0, 0]} barSize={14} name="Материалы визитов" />
          <Bar dataKey="Солярий" stackId="revenue" fill="#eab308" radius={[3, 3, 0, 0]} barSize={14} name="Сеансы солярия" />
          <Area
            type="monotone"
            dataKey="Выручка"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Общая выручка"
            activeDot={{ r: 6 }}
            dot={{ stroke: "#10b981", strokeWidth: 1, r: 2, fill: chartColors.dotFill }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MasterRevenueDistribution({
  data,
  chartColors,
}: {
  data: MasterRevenueRow[];
  chartColors: ChartColors;
}) {
  const totalServices = data.reduce((s, i) => s + i.total, 0);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-xs font-sans">
        Нет завершенных визитов или данных по мастерам за выбранный месяц
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div className="md:col-span-5 flex justify-center">
        <div className="h-[220px] w-[240px] relative flex justify-center items-center">
          <RechartsPieChart width={240} height={220}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="total"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={MASTER_COLORS[index % MASTER_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                color: chartColors.tooltipText,
                borderRadius: "12px",
                border: `1px solid ${chartColors.tooltipBorder}`,
                fontSize: "11px",
                padding: "8px",
              }}
              formatter={(value: any, name: any) => [`${value.toLocaleString()} ₽`, name]}
            />
          </RechartsPieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-sans font-black">Всего услуг</span>
            <span className="text-md font-black text-slate-800 font-mono font-bold">
              {totalServices.toLocaleString()} ₽
            </span>
          </div>
        </div>
      </div>

      <div className="md:col-span-7 space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 font-sans">
          Рейтинг и доли выработки мастеров
        </h4>
        <div className="space-y-3 font-sans">
          {data.map((item, idx) => {
            const barColor = MASTER_COLORS[idx % MASTER_COLORS.length];
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full inline-block"
                      style={{ backgroundColor: barColor }}
                    />
                    <span className="text-slate-800 font-bold">{item.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                      {item.position}
                    </span>
                  </div>
                  <div className="text-right font-mono text-slate-600">
                    <span className="text-slate-800 font-black">{item.total.toLocaleString()} ₽</span>
                    <span className="text-slate-400 ml-1.5 font-bold">({item.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pl-4">
                  <span>
                    Визитов: <strong className="text-slate-600 font-bold">{item.count}</strong>
                  </span>
                  <span className="flex gap-2">
                    <span>
                      Работа:{" "}
                      <strong className="text-slate-600 font-bold">{item.work.toLocaleString()} ₽</strong>
                    </span>
                    <span>
                      Расходники:{" "}
                      <strong className="text-indigo-600 font-bold">{item.materials.toLocaleString()} ₽</strong>
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
