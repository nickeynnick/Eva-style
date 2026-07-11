import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, User, Gift, AlertCircle } from "lucide-react";
import { Visit, GiftCertificate, DebtRecord } from "../types";
import ModalOverlay from "./ModalOverlay";

interface GlobalSearchProps {
  visits: Visit[];
  giftCertificates: GiftCertificate[];
  debtRecords: DebtRecord[];
  onSelectVisit: (date: string) => void;
  onSelectCertificate: () => void;
  onSelectDebt: () => void;
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function GlobalSearch({
  visits,
  giftCertificates,
  debtRecords,
  onSelectVisit,
  onSelectCertificate,
  onSelectDebt,
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const results = useMemo(() => {
    const q = normalizeQuery(query);
    if (q.length < 2) {
      return { visits: [] as Visit[], certificates: [] as GiftCertificate[], debts: [] as DebtRecord[] };
    }

    const digitsOnly = q.replace(/\D/g, "");

    const visitMatches = visits
      .filter((v) => !v.isDeleted)
      .filter((v) => {
        const name = (v.clientName || "").toLowerCase();
        const phone = (v.clientPhone || "").replace(/\D/g, "");
        return name.includes(q) || (digitsOnly.length >= 3 && phone.includes(digitsOnly));
      })
      .slice(0, 8);

    const certMatches = giftCertificates
      .filter((c) => c.code.includes(digitsOnly || q) || (c.soldTo || "").toLowerCase().includes(q))
      .slice(0, 8);

    const debtMatches = debtRecords
      .filter((d) => {
        const name = d.clientName.toLowerCase();
        const phone = (d.clientPhone || "").replace(/\D/g, "");
        return name.includes(q) || (digitsOnly.length >= 3 && phone.includes(digitsOnly));
      })
      .slice(0, 8);

    return { visits: visitMatches, certificates: certMatches, debts: debtMatches };
  }, [query, visits, giftCertificates, debtRecords]);

  const totalResults =
    results.visits.length + results.certificates.length + results.debts.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 transition-colors"
        title="Быстрый поиск (клиент, сертификат, должник)"
        id="global-search-btn"
      >
        <Search className="h-3.5 w-3.5" />
      </button>

      <ModalOverlay
        open={open}
        onClose={() => setOpen(false)}
        className="flex items-start justify-center pt-[12vh] px-4"
        aria-label="Быстрый поиск"
      >
          <div
            className="w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
            id="global-search-panel"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Имя, телефон, номер сертификата, должник…"
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {normalizeQuery(query).length < 2 ? (
                <p className="text-xs text-slate-400 text-center py-6">Введите минимум 2 символа</p>
              ) : totalResults === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Ничего не найдено</p>
              ) : (
                <div className="space-y-3">
                  {results.visits.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase text-slate-400 px-2 mb-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Визиты / клиенты
                      </div>
                      {results.visits.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            onSelectVisit(v.date);
                            setOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-rose-50 text-xs"
                        >
                          <span className="font-semibold text-slate-800">
                            {v.clientName || "Без имени"}
                          </span>
                          {v.clientPhone && (
                            <span className="text-slate-500 ml-1">· {v.clientPhone}</span>
                          )}
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {new Date(v.date).toLocaleDateString("ru-RU")} · {v.workCost + v.materialsCost} ₽
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.certificates.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase text-slate-400 px-2 mb-1 flex items-center gap-1">
                        <Gift className="h-3 w-3" /> Сертификаты
                      </div>
                      {results.certificates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelectCertificate();
                            setOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-violet-50 text-xs"
                        >
                          <span className="font-mono font-bold text-violet-700">№ {c.code}</span>
                          <span className="text-slate-600 ml-1">
                            · остаток {c.balance.toLocaleString()} ₽
                          </span>
                          {c.soldTo && (
                            <span className="block text-[10px] text-slate-400">{c.soldTo}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {results.debts.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold uppercase text-slate-400 px-2 mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Должники
                      </div>
                      {results.debts.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            onSelectDebt();
                            setOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-amber-50 text-xs"
                        >
                          <span className="font-semibold text-slate-800">{d.clientName}</span>
                          {d.clientPhone && (
                            <span className="text-slate-500 ml-1">· {d.clientPhone}</span>
                          )}
                          <span className="block text-[10px] text-amber-700 font-mono">
                            {d.isClosed ? "закрыт" : `остаток ${d.remainingAmount.toLocaleString()} ₽`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </ModalOverlay>
    </>
  );
}
