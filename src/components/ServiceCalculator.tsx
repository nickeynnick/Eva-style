import React, { useState, useEffect } from "react";
import { RawMaterialPrices } from "../types";
import { Sparkles, Layers, Ruler, Database, Info, HelpCircle } from "lucide-react";

interface ServiceCalculatorProps {
  materialPrices: RawMaterialPrices;
  materialConsumptions?: {
    lamination?: Record<string, { shampoo: number; lotion: number; mask: number; gel: number; constant: number; baseCost?: number }>;
    biocurl?: Record<string, { shampoo: number; base: number; lotionOne: number; lotionTwo: number; cond: number; serum: number; constant: number; baseCost?: number }>;
  };
  hideFormulaCalculations?: boolean;
}

export default function ServiceCalculator({ materialPrices, materialConsumptions, hideFormulaCalculations = false }: ServiceCalculatorProps) {
  // Service selection: 'lamination' | 'biocurl'
  const [activeTab, setActiveTab] = useState<"lamination" | "biocurl">("lamination");
  
  // Inputs: support partial value for bio permanent + standard four lengths
  const [hairLength, setHairLength] = useState<"частичная" | "короткие" | "средние" | "удлиненные" | "длинные">("средние");
  const [activeMaterialQty, setActiveMaterialQty] = useState<number | "">("");

  // Base work cost can be adjusted
  const [baseWorkCost, setBaseWorkCost] = useState<number>(1300);

  // Default fallbacks with proper laundry values
  const defaultConsumptions = {
    lamination: {
      короткие: { shampoo: 15, lotion: 10, mask: 10, gel: 45, constant: 105, baseCost: 1000 },
      средние: { shampoo: 20, lotion: 15, mask: 15, gel: 65, constant: 125, baseCost: 1300 },
      удлиненные: { shampoo: 25, lotion: 20, mask: 20, gel: 120, constant: 150, baseCost: 1500 },
      длинные: { shampoo: 30, lotion: 25, mask: 25, gel: 100, constant: 150, baseCost: 1800 }
    },
    biocurl: {
      частичная: { shampoo: 5, base: 4, lotionOne: 10, lotionTwo: 10, cond: 10, serum: 8, constant: 80, baseCost: 800 },
      короткие: { shampoo: 8, base: 6, lotionOne: 12, lotionTwo: 12, cond: 12, serum: 10, constant: 100, baseCost: 1000 },
      средние: { shampoo: 12, base: 10, lotionOne: 15, lotionTwo: 15, cond: 20, serum: 15, constant: 120, baseCost: 1200 },
      удлиненные: { shampoo: 15, base: 12, lotionOne: 18, lotionTwo: 18, cond: 22, serum: 18, constant: 140, baseCost: 1400 },
      длинные: { shampoo: 18, base: 15, lotionOne: 20, lotionTwo: 20, cond: 25, serum: 20, constant: 150, baseCost: 1600 }
    }
  };

  // Get active configurations based on length and tab
  const getActiveLaminationConfig = () => {
    const len = hairLength === "частичная" ? "средние" : hairLength;
    return materialConsumptions?.lamination?.[len] || defaultConsumptions.lamination[len];
  };

  const getActiveBioCurlConfig = () => {
    return materialConsumptions?.biocurl?.[hairLength] || defaultConsumptions.biocurl[hairLength];
  };

  // Sync baseWorkCost with configured values from Settings automatically when tab or length shifts
  useEffect(() => {
    if (activeTab === "lamination" && hairLength === "частичная") {
      setHairLength("средние");
      return;
    }
    const config = activeTab === "lamination" ? getActiveLaminationConfig() : getActiveBioCurlConfig();
    const defaultBase = config.baseCost !== undefined ? config.baseCost : (activeTab === "lamination"
      ? (hairLength === "короткие" ? 1000 : hairLength === "средние" ? 1300 : hairLength === "удлиненные" ? 1500 : 1800)
      : (hairLength === "частичная" ? 800 : hairLength === "короткие" ? 1000 : hairLength === "средние" ? 1200 : hairLength === "удлиненные" ? 1400 : 1600)
    );
    setBaseWorkCost(defaultBase);
    setActiveMaterialQty(""); // Reset input to suggest default
  }, [activeTab, hairLength, materialConsumptions]);

  const activeMaterialVal = activeMaterialQty !== "" ? Number(activeMaterialQty) : 0;

  // Pricing calculations
  let rows: Array<{
    name: string;
    unitPrice: number;
    unitName: string;
    consumption: number;
    cost: number;
    note?: string;
  }> = [];

  let intermediateSum = 0;
  let totalMaterialsCost = 0;
  
  // Variables for rendering equations
  let formulaLabel = "";
  let formulaMath = "";
  let finalMaterialLabel = "";
  let finalMaterialMath = "";

  if (activeTab === "lamination") {
    const config = getActiveLaminationConfig();
    const gelQty = activeMaterialQty !== "" ? activeMaterialVal : config.gel;

    const shampooCost = (materialPrices.shampooProscenia || 6.222) * config.shampoo;
    const lotionCost = (materialPrices.lotionAcPretreatment || 4.991) * config.lotion;
    const maskCost = (materialPrices.maskProscenia || 5.387) * config.mask;
    const gelCost = (materialPrices.laminatingGel || 12.0) * gelQty;
    const laundryCost = config.constant;

    // Rule 4: промежуточный итог: (шампунь+лосьен+маска)*3+белье
    intermediateSum = (shampooCost + lotionCost + maskCost) * 3 + laundryCost;
    
    // Rule 5: Стоимость материалов lamination: промежуточный итог + ламинирующий гель/крем
    totalMaterialsCost = intermediateSum + gelCost;

    formulaLabel = `Промежуточный итог: (Шампунь + Лосьон + Маска) * 3 + Белье`;
    formulaMath = `(${shampooCost.toFixed(1)} + ${lotionCost.toFixed(1)} + ${maskCost.toFixed(1)}) * 3 + ${laundryCost} = ${intermediateSum.toFixed(2)} ₽`;

    finalMaterialLabel = `Стоимость материалов: Промежуточный итог + Гель/крем`;
    finalMaterialMath = `${intermediateSum.toFixed(1)} + ${gelCost.toFixed(1)} = ${totalMaterialsCost.toFixed(2)} ₽`;

    rows = [
      {
        name: "Шампунь для волос PROSCENIA SHAMPOO",
        unitPrice: materialPrices.shampooProscenia || 6.222,
        unitName: "мл",
        consumption: config.shampoo,
        cost: shampooCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Увлажняющий лосьон для волос AC PRETREATMENT",
        unitPrice: materialPrices.lotionAcPretreatment || 4.991,
        unitName: "мл",
        consumption: config.lotion,
        cost: lotionCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Маска по уходу за прямыми волосами PROSCENIA TREATMENT M/ L",
        unitPrice: materialPrices.maskProscenia || 5.387,
        unitName: "мл",
        consumption: config.mask,
        cost: maskCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Белье (расходы на стирку/одноразовые расходники)",
        unitPrice: laundryCost,
        unitName: "усл",
        consumption: 1,
        cost: laundryCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Ламинирующий гель/крем",
        unitPrice: materialPrices.laminatingGel || 12.0,
        unitName: "гр",
        consumption: gelQty,
        cost: gelCost,
        note: "Добавляется отдельно к итогу сырья"
      }
    ];
  } else {
    // Bio permanence
    const config = getActiveBioCurlConfig();
    const lotionQty = activeMaterialQty !== "" ? activeMaterialVal : config.lotionOne;

    const shampooCost = (materialPrices.shampooProeditCurlFit || 6.0) * config.shampoo;
    const baseCostItem = (materialPrices.basePliaBase || 20.0) * config.base;
    const lotionOneCost = (materialPrices.lotionPliaStep1 || 13.34) * lotionQty;
    const lotionTwoCost = (materialPrices.lotionPliaStep2 || 5.0) * lotionQty; // Quantity corresponds to Step 1 directly
    const condCost = (materialPrices.conditionerPearl || 8.5) * config.cond;
    const serumCost = (materialPrices.serumAfterPerm || 15.0) * config.serum;
    const laundryCost = config.constant;

    // Rule 4: промежуточный итог для био-завивки: (шампунь+база+кондиционер+сыворотка)*3+белье
    intermediateSum = (shampooCost + baseCostItem + condCost + serumCost) * 3 + laundryCost;
    
    // Rule 5: Стоимость материалов biocurl: лосьен шаг 1 + лосьен шаг 2 + промежуточный итог
    totalMaterialsCost = lotionOneCost + lotionTwoCost + intermediateSum;

    formulaLabel = `Промежуточный итог: (Шампунь + База + Кондиционер + Сыворотка) * 3 + Белье`;
    formulaMath = `(${shampooCost.toFixed(1)} + ${baseCostItem.toFixed(1)} + ${condCost.toFixed(1)} + ${serumCost.toFixed(1)}) * 3 + ${laundryCost} = ${intermediateSum.toFixed(2)} ₽`;

    finalMaterialLabel = `Стоимость материалов: Лосьон Шаг 1 + Лосьон Шаг 2 + Промежуточный итог`;
    finalMaterialMath = `${lotionOneCost.toFixed(1)} + ${lotionTwoCost.toFixed(1)} + ${intermediateSum.toFixed(1)} = ${totalMaterialsCost.toFixed(2)} ₽`;

    rows = [
      {
        name: "Шампунь для волос PROEDIT SHAMPOO CURL FIT",
        unitPrice: materialPrices.shampooProeditCurlFit || 6.0,
        unitName: "мл",
        consumption: config.shampoo,
        cost: shampooCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "База для восстановления волос PLIA BASE",
        unitPrice: materialPrices.basePliaBase || 20.0,
        unitName: "мл",
        consumption: config.base,
        cost: baseCostItem,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Лосьон для химической завивки волос Шаг 1 PLIA CURL 1",
        unitPrice: materialPrices.lotionPliaStep1 || 13.34,
        unitName: "мл",
        consumption: lotionQty,
        cost: lotionOneCost,
        note: "Добавляется отдельно к итогу"
      },
      {
        name: "Лосьон для химической завивки волос Шаг 2 PLIA CURL 2",
        unitPrice: materialPrices.lotionPliaStep2 || 5.0,
        unitName: "мл",
        consumption: lotionQty, 
        cost: lotionTwoCost,
        note: "Расход всегда равен Шагу 1 (" + lotionQty + " мл)"
      },
      {
        name: "Кондиционер для волос Жемчужный PEARL COAT",
        unitPrice: materialPrices.conditionerPearl || 8.5,
        unitName: "мл",
        consumption: config.cond,
        cost: condCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Сыворотка для волос PROEDIT CARE WORKS 1/AFTER PERM",
        unitPrice: materialPrices.serumAfterPerm || 15.0,
        unitName: "мл",
        consumption: config.serum,
        cost: serumCost,
        note: "Входит в промежуточный итог"
      },
      {
        name: "Белье (расходы на стирку/одноразовые расходники)",
        unitPrice: laundryCost,
        unitName: "усл",
        consumption: 1,
        cost: laundryCost,
        note: "Входит в промежуточный итог"
      }
    ];
  }

  // Rule 6: Итог считается так: базовая стоимость + стоимость материалов
  const totalClientCost = baseWorkCost + totalMaterialsCost;

  return (
    <div className="space-y-6" id="service-calculator-view">
      {/* View Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="calculator-header">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-sans tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Технологический калькулятор процедур
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Точнейший автоматический расчет стоимости препаратов и работ на базе заданных вами норм и регламентов салонного сервиса.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-medium shadow-3xs self-start md:self-auto">
          <Database className="h-4 w-4" />
          <span className="font-mono uppercase tracking-wider">Интеграция с настройками</span>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        
        {/* Step 1: Choose Service */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">1. Выберите салонную процедуру:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="service-selection-tabs">
            <button
              onClick={() => setActiveTab("lamination")}
              className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "lamination"
                  ? "bg-indigo-50 border-indigo-400 text-indigo-800 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              Ламинирование волос LebeL
            </button>
            <button
              onClick={() => setActiveTab("biocurl")}
              className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === "biocurl"
                  ? "bg-purple-50 border-purple-400 text-purple-800 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Layers className="h-4.5 w-4.5 text-purple-500" />
              Био-завивка PLIA
            </button>
          </div>
        </div>

        {/* Step 2: Input Variables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Hair Length Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5 text-slate-400" />
              2. Длина волос клиета (берется базовая цена и расход):
            </label>
            <select
              value={hairLength}
              onChange={(e) => setHairLength(e.target.value as any)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="hair-length-select"
            >
              {activeTab === "biocurl" && (
                <option value="частичная">Частичная</option>
              )}
              <option value="короткие">Короткие волосы</option>
              <option value="средние">Средние волосы</option>
              <option value="удлиненные">Удлиненные волосы</option>
              <option value="длинные">Длинные волосы</option>
            </select>
          </div>

          {/* Active Material Qty Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              3. Изменить количество основного препарата:
            </label>
            <input
              type="number"
              placeholder={activeTab === "lamination" ? "Введите количество (гр)" : "Введите количество (мл)"}
              value={activeMaterialQty}
              onChange={(e) => setActiveMaterialQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              min="0"
              id="active-material-input"
            />
          </div>
        </div>

        {/* Step 3: Detailed Equations (Highly request-specific visual) */}
        {!hideFormulaCalculations && (
          <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 space-y-3 font-sans">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Info className="h-4 w-4 text-indigo-600" />
              Технологическая калькуляция по формулам:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">{formulaLabel}</span>
                <span className="text-xs font-extrabold font-mono text-indigo-700 block">{formulaMath}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">{finalMaterialLabel}</span>
                <span className="text-xs font-extrabold font-mono text-orange-600 block">{finalMaterialMath}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Detailed raw materials table */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Детализация сырья по стоимости</h4>
            <span className="text-[10px] text-slate-400 font-medium font-sans">Коэффициент EXCEL исключен по вашему требованию</span>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2.5 px-4 w-1/2">Слово в прайсе / Препарат</th>
                  <th className="py-2.5 px-4 text-right">За 1 мл/гр</th>
                  <th className="py-2.5 px-4 text-center">Расход на сеанс</th>
                  <th className="py-2.5 px-4 text-right">Стоимость сырья</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700">{row.name}</div>
                      {row.note && <div className="text-[10px] text-slate-400 mt-0.5">{row.note}</div>}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      {row.unitName === "усл" ? "настройки" : `${row.unitPrice.toFixed(4)} ₽ / ${row.unitName}`}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 font-mono">
                      {row.unitName === "усл" ? "—" : `${row.consumption} ${row.unitName}`}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-700 font-mono">
                      {row.cost.toFixed(2)} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 5: Cost summary badge */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center border border-slate-800" id="calculation-result-block">
          <div className="md:col-span-2 space-y-4">
            <span className="text-xs text-indigo-400 font-semibold uppercase tracking-widest block font-sans">Итоговый расчет себестоимости ({hairLength} волосы)</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Базовая стоимость работы (только отображение):</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-lg font-bold font-mono text-indigo-300 bg-slate-800/40 border border-slate-700/40 rounded px-2.5 py-0.5 select-none">
                    {baseWorkCost} ₽
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Стоимость материалов (по формулам):</div>
                <div className="text-lg font-bold font-mono text-orange-400 mt-1">
                  {totalMaterialsCost.toFixed(2)} ₽
                </div>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8 flex flex-col justify-center items-center md:items-end">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest block mb-1">ИТОГО / работа + материалы /</span>
            <div className="text-3xl md:text-4xl font-extrabold font-mono text-indigo-400">
              {Math.ceil(totalClientCost).toLocaleString()} ₽
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
