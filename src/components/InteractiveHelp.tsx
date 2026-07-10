import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  BookOpen,
  Calculator,
  DollarSign,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Calendar,
  Sun,
  Users,
  ShieldCheck,
  LayoutGrid,
  Wallet,
} from "lucide-react";
import { faqs, HELP_CATEGORIES, CATEGORY_LABELS, HelpCategory } from "../data/helpContent";

const CATEGORY_ICONS: Record<HelpCategory | "all", React.ComponentType<{ className?: string }>> = {
  all: BookOpen,
  general: LayoutGrid,
  accounting: Calendar,
  calculator: Calculator,
  solarium: Sun,
  salaries: DollarSign,
  admin: Users,
  owner: Briefcase,
  security: ShieldCheck,
};

export default function InteractiveHelp() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [simTab, setSimTab] = useState<"salary" | "cash">("salary");

  const [simPosition, setSimPosition] = useState<"master" | "admin">("master");
  const [simWorkCost, setSimWorkCost] = useState<number>(3500);
  const [simMaterialsCost, setSimMaterialsCost] = useState<number>(600);
  const [simIsSalonMaterials, setSimIsSalonMaterials] = useState<boolean>(true);
  const [simPercent, setSimPercent] = useState<number>(40);
  const [simMaterialsPercent, setSimMaterialsPercent] = useState<number>(10);
  const [simDailyRent, setSimDailyRent] = useState<number>(150);
  const [simShiftRate, setSimShiftRate] = useState<number>(2000);

  const [simStartCash, setSimStartCash] = useState<number>(5000);
  const [simCashVisits, setSimCashVisits] = useState<number>(8500);
  const [simCashSolarium, setSimCashSolarium] = useState<number>(1200);
  const [simCashAdditions, setSimCashAdditions] = useState<number>(1000);
  const [simCashExpenses, setSimCashExpenses] = useState<number>(1500);
  const [simCashPayouts, setSimCashPayouts] = useState<number>(2050);

  const simWageCalculations = useMemo(() => {
    if (simPosition === "admin") {
      return {
        stepByStep: [
          { name: "Фиксированная ставка за смену", formula: `${simShiftRate} ₽`, result: simShiftRate },
          { name: "Итого к начислению", formula: `${simShiftRate} ₽`, result: simShiftRate },
        ],
        totalEarned: simShiftRate,
      };
    }

    const workShare = (simWorkCost * simPercent) / 100;
    let materialsShare = 0;
    if (!simIsSalonMaterials) {
      materialsShare = (simMaterialsCost * simMaterialsPercent) / 100;
    }
    const finalEarned = Math.max(0, workShare + materialsShare - simDailyRent);

    return {
      stepByStep: [
        { name: "Начисление за услуги", formula: `${simWorkCost} ₽ × ${simPercent}%`, result: workShare },
        {
          name: "Начисление за материалы",
          formula: simIsSalonMaterials
            ? "0 ₽ (материалы за счёт салона)"
            : `${simMaterialsCost} ₽ × ${simMaterialsPercent}% (материалы мастера)`,
          result: materialsShare,
        },
        { name: "Вычет суточной аренды рабочего места", formula: `−${simDailyRent} ₽`, result: -simDailyRent },
        {
          name: "Чистый заработок за смену",
          formula: `${workShare} + ${materialsShare} − ${simDailyRent}`,
          result: finalEarned,
        },
      ],
      totalEarned: finalEarned,
    };
  }, [simPosition, simWorkCost, simMaterialsCost, simIsSalonMaterials, simPercent, simMaterialsPercent, simDailyRent, simShiftRate]);

  const simCashEnding = useMemo(() => {
    const totalCashIn = simCashVisits + simCashSolarium + simCashAdditions;
    const totalCashOut = simCashExpenses + simCashPayouts;
    const endCash = Math.max(0, simStartCash + totalCashIn - totalCashOut);
    return { totalCashIn, totalCashOut, endCash };
  }, [simStartCash, simCashVisits, simCashSolarium, simCashAdditions, simCashExpenses, simCashPayouts]);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      (faq.keywords && faq.keywords.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const categoryTitle =
    activeCategory === "all"
      ? "Полный справочник программы"
      : CATEGORY_LABELS[activeCategory as HelpCategory];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans" id="interactive-help-root">
      <div
        className="bg-gradient-to-r from-rose-50 to-indigo-50 p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        id="help-hero"
      >
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center justify-center md:justify-start gap-2.5">
            <HelpCircle className="h-6 w-6 text-rose-500" />
            Справочный центр «Ева-стиль»
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-medium leading-relaxed">
            Полное руководство по всем вкладкам, действиям и сценариям работы: учёт визитов, касса, солярий,
            зарплаты, табель, калькулятор, кабинет владелицы и безопасность. {faqs.length} статей с описанием
            принципов расчёта.
          </p>
        </div>

        <div className="relative w-full md:w-96 shadow-xs rounded-xl overflow-hidden">
          <input
            type="text"
            placeholder="Поиск по справке (визит, касса, пароль…)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setExpandedFaqIndex(null);
            }}
            className="w-full bg-white text-slate-800 pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400 border border-slate-200 rounded-xl"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="help-grid-container">
        <div className="lg:col-span-3 space-y-2" id="help-navigation-sidebar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-3">
            Разделы справки
          </span>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-150 shadow-xs space-y-1 max-h-[70vh] overflow-y-auto">
            {HELP_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id];
              const count =
                cat.id === "all" ? faqs.length : faqs.filter((f) => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setExpandedFaqIndex(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                    activeCategory === cat.id
                      ? "bg-rose-50 text-rose-700 border border-rose-200/50"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${activeCategory === cat.id ? "text-rose-600" : "text-slate-400"}`}
                    />
                    <span className="truncate">{cat.label}</span>
                  </span>
                  <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6" id="help-content-area">
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4" id="interactive-math-simulator">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                  Интерактивные калькуляторы
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                  <Calculator className="h-4.5 w-4.5 text-rose-500" />
                  Проверьте формулы программы в песочнице
                </h3>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-full max-w-lg">
              <button
                onClick={() => setSimTab("salary")}
                className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                  simTab === "salary" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Зарплата
              </button>
              <button
                onClick={() => setSimTab("cash")}
                className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                  simTab === "cash" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" />
                Касса дня
              </button>
            </div>

            {simTab === "salary" ? (
              <>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-lg w-full max-w-md border border-slate-100">
                  <button
                    onClick={() => setSimPosition("master")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                      simPosition === "master" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Мастер
                  </button>
                  <button
                    onClick={() => setSimPosition("admin")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                      simPosition === "admin" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Администратор
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-5 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-xs">
                    {simPosition === "master" ? (
                      <>
                        <SliderRow label="Стоимость работы:" value={simWorkCost} display={`${simWorkCost} ₽`} min={500} max={10000} step={100} onChange={setSimWorkCost} />
                        <SliderRow label="Процент мастера:" value={simPercent} display={`${simPercent}%`} min={10} max={90} step={5} onChange={setSimPercent} />
                        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={simIsSalonMaterials} onChange={(e) => setSimIsSalonMaterials(e.target.checked)} className="rounded text-rose-500 h-4 w-4" />
                          Материалы от салона?
                        </label>
                        <SliderRow label="Стоимость материалов:" value={simMaterialsCost} display={`${simMaterialsCost} ₽`} min={0} max={3000} step={50} onChange={setSimMaterialsCost} />
                        {!simIsSalonMaterials && (
                          <SliderRow label="% за материалы мастера:" value={simMaterialsPercent} display={`${simMaterialsPercent}%`} min={0} max={100} step={5} onChange={setSimMaterialsPercent} />
                        )}
                        <SliderRow label="Аренда за день:" value={simDailyRent} display={`${simDailyRent} ₽`} min={0} max={1000} step={50} onChange={setSimDailyRent} />
                      </>
                    ) : (
                      <SliderRow label="Ставка за смену:" value={simShiftRate} display={`${simShiftRate} ₽`} min={500} max={5000} step={100} onChange={setSimShiftRate} />
                    )}
                  </div>

                  <div className="md:col-span-7 bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                    <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-1 border-b border-slate-800 pb-1.5">
                      <FileCheck className="h-3.5 w-3.5" />
                      Пошаговый расчёт (как во вкладке «Зарплаты»)
                    </span>
                    <div className="space-y-3">
                      {simWageCalculations.stepByStep.map((step, idx) => (
                        <div key={idx} className="flex justify-between items-baseline gap-2.5">
                          <div className="text-slate-400">
                            <span className="text-slate-500 mr-1">{idx + 1}.</span>
                            {step.name}
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5">{step.formula}</div>
                          </div>
                          <span className={`font-bold whitespace-nowrap ${step.result < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            {step.result > 0 ? "+" : ""}
                            {step.result.toLocaleString()} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center p-2.5 rounded bg-slate-950/20">
                      <span className="text-sm font-bold text-white font-sans">ИТОГО:</span>
                      <span className="text-lg font-black text-rose-400 font-mono">
                        {simWageCalculations.totalEarned.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-xs">
                  <SliderRow label="Касса на утро:" value={simStartCash} display={`${simStartCash} ₽`} min={0} max={50000} step={500} onChange={setSimStartCash} />
                  <SliderRow label="Визиты (наличные):" value={simCashVisits} display={`${simCashVisits} ₽`} min={0} max={50000} step={500} onChange={setSimCashVisits} />
                  <SliderRow label="Солярий (наличные):" value={simCashSolarium} display={`${simCashSolarium} ₽`} min={0} max={10000} step={100} onChange={setSimCashSolarium} />
                  <SliderRow label="Прочие внесения (+):" value={simCashAdditions} display={`${simCashAdditions} ₽`} min={0} max={20000} step={100} onChange={setSimCashAdditions} />
                  <SliderRow label="Расходы дня (−):" value={simCashExpenses} display={`${simCashExpenses} ₽`} min={0} max={20000} step={100} onChange={setSimCashExpenses} />
                  <SliderRow label="Выплаты сотрудникам (−):" value={simCashPayouts} display={`${simCashPayouts} ₽`} min={0} max={30000} step={100} onChange={setSimCashPayouts} />
                </div>
                <div className="md:col-span-7 bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                  <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-1 border-b border-slate-800 pb-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    Формула «Касса на вечер» (вкладка «Учёт за день»)
                  </span>
                  <div className="space-y-2 text-slate-400 font-sans text-xs">
                    <p>Касса на вечер = max(0, Утро + Приход − Расход − Выплаты)</p>
                    <div className="flex justify-between">
                      <span>Касса на начало:</span>
                      <span className="text-slate-200 font-bold">{simStartCash.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Наличные (визиты + солярий + внесения):</span>
                      <span className="text-emerald-400 font-bold">+{simCashEnding.totalCashIn.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span>− Расходы и выплаты:</span>
                      <span className="text-rose-400 font-bold">−{simCashEnding.totalCashOut.toLocaleString()} ₽</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center p-2.5 rounded bg-emerald-950/30">
                    <span className="text-sm font-bold text-white font-sans">Касса на вечер:</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {simCashEnding.endCash.toLocaleString()} ₽
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                    Безналичные поступления и комиссия эквайринга в этот расчёт не входят — они отображаются отдельно в «Финансовом контуре дня».
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4" id="faqs-accordion-box">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Справочник</span>
                <h3 className="text-md sm:text-lg font-extrabold text-slate-800">{categoryTitle}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Найдено статей: {filteredFaqs.length}
                  {searchQuery && ` по запросу «${searchQuery}»`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedFaqIndex(-1)}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                >
                  Развернуть все
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFaqIndex(null)}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                >
                  Свернуть
                </button>
              </div>
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                По запросу «{searchQuery}» ничего не найдено. Попробуйте: «визит», «касса», «пароль», «солярий».
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFaqs.map((faq, index) => {
                  const isExpanded = expandedFaqIndex === index || expandedFaqIndex === -1;
                  return (
                    <div key={`${faq.category}-${index}`} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFaqIndex(isExpanded && expandedFaqIndex !== -1 ? null : index)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors text-xs sm:text-sm font-bold text-slate-700"
                      >
                        <span className="flex items-start gap-2.5 pr-4">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          {faq.question}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed space-y-3">
                          <p>{faq.answer}</p>
                          <div className="pt-1">
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                              {CATEGORY_LABELS[faq.category]}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-bold text-slate-700">
        <span>{label}</span>
        <span className="font-mono text-rose-600">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
      />
    </div>
  );
}
