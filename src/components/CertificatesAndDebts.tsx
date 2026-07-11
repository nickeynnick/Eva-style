import React, { useState } from "react";
import {
  GiftCertificate,
  DebtRecord,
  ReceivingPaymentMethod,
  SettingsRule,
} from "../types";
import {
  RECEIVING_PAYMENT_METHODS,
  isValidCertificateNumber,
  normalizeCertificateNumber,
  paymentMethodLabel,
  calculateAcquiring,
} from "../utils/paymentUtils";
import { getActiveSettingsForDate } from "../utils/settingsUtils";
import {
  Gift,
  Users,
  Plus,
  Calendar,
  CheckCircle2,
  Ban,
  Trash2,
} from "lucide-react";

interface CertificatesAndDebtsProps {
  giftCertificates: GiftCertificate[];
  setGiftCertificates: React.Dispatch<React.SetStateAction<GiftCertificate[]>>;
  debtRecords: DebtRecord[];
  setDebtRecords: React.Dispatch<React.SetStateAction<DebtRecord[]>>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  allowDeleteCertificates?: boolean;
  settingsRules: SettingsRule[];
}

export default function CertificatesAndDebts({
  giftCertificates,
  setGiftCertificates,
  debtRecords,
  setDebtRecords,
  selectedDate,
  setSelectedDate,
  allowDeleteCertificates = false,
  settingsRules,
}: CertificatesAndDebtsProps) {
  const [certNominal, setCertNominal] = useState<number | "">("");
  const [certNumber, setCertNumber] = useState("");
  const [certSoldTo, setCertSoldTo] = useState("");
  const [certNote, setCertNote] = useState("");
  const [certSalePayment, setCertSalePayment] = useState<ReceivingPaymentMethod>("наличные");
  const [certSoldDate, setCertSoldDate] = useState(selectedDate);

  const [payDebtId, setPayDebtId] = useState("");
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState<ReceivingPaymentMethod>("наличные");
  const [payComment, setPayComment] = useState("");
  const [payDate, setPayDate] = useState(selectedDate);
  const [confirmDeleteCertId, setConfirmDeleteCertId] = useState<string | null>(null);

  React.useEffect(() => {
    setCertSoldDate(selectedDate);
    setPayDate(selectedDate);
  }, [selectedDate]);

  const activeCerts = giftCertificates.filter((c) => c.isActive && c.balance > 0);
  const closedCerts = giftCertificates.filter((c) => !c.isActive || c.balance <= 0);
  const openDebts = debtRecords.filter((d) => !d.isClosed && d.remainingAmount > 0);
  const closedDebts = debtRecords.filter((d) => d.isClosed || d.remainingAmount <= 0);

  const handleIssueCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCertificateNumber(certNumber);
    if (!isValidCertificateNumber(code)) {
      alert("Укажите номер сертификата — только цифры");
      return;
    }
    if (giftCertificates.some((c) => c.code === code)) {
      alert(`Сертификат с номером ${code} уже существует`);
      return;
    }
    if (certNominal === "" || Number(certNominal) <= 0) {
      alert("Укажите номинал сертификата");
      return;
    }
    const nominal = Number(certNominal);
    const newCert: GiftCertificate = {
      id: "cert-" + Date.now(),
      code,
      nominal,
      balance: nominal,
      soldDate: certSoldDate,
      soldTo: certSoldTo || undefined,
      salePaymentMethod: certSalePayment,
      note: certNote || undefined,
      isActive: true,
      usages: [],
    };
    setGiftCertificates((prev) => [newCert, ...prev]);
    setCertNominal("");
    setCertNumber("");
    setCertSoldTo("");
    setCertNote("");
  };

  const handleDeactivateCert = (id: string) => {
    setGiftCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: false } : c))
    );
  };

  const handleDeleteCert = (id: string) => {
    const cert = giftCertificates.find((c) => c.id === id);
    if (cert && cert.usages.length > 0) {
      const ok = window.confirm(
        `Сертификат №${cert.code} использовался в ${cert.usages.length} визитах. Удалить безвозвратно?`
      );
      if (!ok) {
        setConfirmDeleteCertId(null);
        return;
      }
    }
    setGiftCertificates((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteCertId(null);
  };

  const renderCertActions = (c: GiftCertificate) => (
    <td className="py-1.5 px-2 text-center">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {c.isActive && c.balance > 0 && (
          <button
            type="button"
            onClick={() => handleDeactivateCert(c.id)}
            className="text-[9px] font-bold text-slate-500 hover:text-amber-700 flex items-center gap-0.5"
            title="Закрыть сертификат"
          >
            <Ban className="h-3 w-3" /> Закрыть
          </button>
        )}
        {allowDeleteCertificates && (
          confirmDeleteCertId === c.id ? (
            <button
              type="button"
              onClick={() => handleDeleteCert(c.id)}
              className="text-[9px] font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-0.5 px-1.5 py-0.5 rounded animate-pulse"
            >
              <Trash2 className="h-3 w-3" /> Точно?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteCertId(c.id);
                setTimeout(() => {
                  setConfirmDeleteCertId((current) => (current === c.id ? null : current));
                }, 4000);
              }}
              className="text-[9px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5"
              title="Удалить сертификат"
            >
              <Trash2 className="h-3 w-3" /> Удалить
            </button>
          )
        )}
      </div>
    </td>
  );

  const handlePayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDebtId || payAmount === "" || Number(payAmount) <= 0) {
      alert("Выберите должника и укажите сумму");
      return;
    }
    const amount = Number(payAmount);
    const debt = debtRecords.find((d) => d.id === payDebtId);
    if (!debt) return;
    if (amount > debt.remainingAmount) {
      alert(`Сумма превышает остаток долга (${debt.remainingAmount} ₽)`);
      return;
    }

    const payment = {
      id: "debtpay-" + Date.now(),
      date: payDate,
      amount,
      paymentMethod: payMethod,
      acquiringCost:
        payMethod === "дебетовая карта"
          ? calculateAcquiring(
              amount,
              "дебетовая карта",
              getActiveSettingsForDate(settingsRules, payDate).acquiringCommission
            )
          : undefined,
      comment: payComment || undefined,
    };

    setDebtRecords((prev) =>
      prev.map((d) => {
        if (d.id !== payDebtId) return d;
        const remaining = Math.round((d.remainingAmount - amount) * 100) / 100;
        return {
          ...d,
          remainingAmount: remaining,
          isClosed: remaining <= 0,
          payments: [...d.payments, payment],
        };
      })
    );
    setPayAmount("");
    setPayComment("");
  };

  const certsSoldToday = giftCertificates.filter((c) => c.soldDate === selectedDate);
  const debtPaymentsToday = debtRecords.flatMap((d) =>
    d.payments.filter((p) => p.date === selectedDate)
  );

  return (
    <div className="space-y-3" id="certificates-debts-view">
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-rose-500" />
            Сертификаты и должники
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">
            Выпуск подарочных сертификатов, учёт остатков и погашение долгов клиентов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Дата:</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-rose-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-200"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Активных сертификатов</span>
          <div className="text-xl font-mono font-bold text-rose-700 mt-1">{activeCerts.length}</div>
          <span className="text-[9px] text-slate-400">
            Остаток: {activeCerts.reduce((s, c) => s + c.balance, 0).toLocaleString()} ₽
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Открытых долгов</span>
          <div className="text-xl font-mono font-bold text-amber-700 mt-1">{openDebts.length}</div>
          <span className="text-[9px] text-slate-400">
            Сумма: {openDebts.reduce((s, d) => s + d.remainingAmount, 0).toLocaleString()} ₽
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">За выбранный день</span>
          <div className="text-[11px] font-mono text-slate-700 mt-1 space-y-0.5">
            <div>Продано сертиф.: {certsSoldToday.length} ({certsSoldToday.reduce((s, c) => s + c.nominal, 0).toLocaleString()} ₽)</div>
            <div>Погашено долгов: {debtPaymentsToday.reduce((s, p) => s + p.amount, 0).toLocaleString()} ₽</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Issue certificate */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            Выпустить подарочный сертификат
          </h3>
          <form onSubmit={handleIssueCertificate} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Номер сертификата *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={certNumber}
                onChange={(e) => setCertNumber(normalizeCertificateNumber(e.target.value))}
                placeholder="Только цифры, например 10042"
                className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 font-mono font-bold bg-slate-50"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Номинал (₽)</label>
                <input
                  type="number"
                  value={certNominal}
                  onChange={(e) => setCertNominal(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 font-mono font-bold bg-slate-50"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Дата продажи</label>
                <input
                  type="date"
                  value={certSoldDate}
                  onChange={(e) => setCertSoldDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Покупатель (необяз.)</label>
              <input
                type="text"
                value={certSoldTo}
                onChange={(e) => setCertSoldTo(e.target.value)}
                placeholder="Имя покупателя"
                className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Оплата при продаже</label>
              <select
                value={certSalePayment}
                onChange={(e) => setCertSalePayment(e.target.value as ReceivingPaymentMethod)}
                className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 font-semibold"
              >
                {RECEIVING_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{paymentMethodLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Примечание</label>
              <input
                type="text"
                value={certNote}
                onChange={(e) => setCertNote(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded text-xs font-bold uppercase tracking-wider"
            >
              Выпустить сертификат
            </button>
          </form>
        </div>

        {/* Pay debt */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Погашение долга клиента
          </h3>
          {openDebts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded border border-dashed border-slate-200">
              Нет открытых долгов
            </p>
          ) : (
            <form onSubmit={handlePayDebt} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Должник</label>
                <select
                  value={payDebtId}
                  onChange={(e) => {
                    setPayDebtId(e.target.value);
                    const d = debtRecords.find((x) => x.id === e.target.value);
                    if (d) setPayAmount(d.remainingAmount);
                  }}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 font-semibold"
                  required
                >
                  <option value="">— Выберите —</option>
                  {openDebts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.clientName} — {d.remainingAmount.toLocaleString()} ₽ (от {new Date(d.visitDate).toLocaleDateString("ru-RU")})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 font-mono font-bold bg-slate-50"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Дата оплаты</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Способ оплаты</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as ReceivingPaymentMethod)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 font-semibold"
                >
                  {RECEIVING_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{paymentMethodLabel(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Комментарий</label>
                <input
                  type="text"
                  value={payComment}
                  onChange={(e) => setPayComment(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded text-xs font-bold uppercase tracking-wider"
              >
                Записать погашение
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Active certificates list */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-rose-500" />
          Активные сертификаты ({activeCerts.length})
        </h3>
        {activeCerts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Нет активных сертификатов</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                  <th className="py-1.5 px-2">Номер</th>
                  <th className="py-1.5 px-2 text-right">Номинал</th>
                  <th className="py-1.5 px-2 text-right">Остаток</th>
                  <th className="py-1.5 px-2">Покупатель</th>
                  <th className="py-1.5 px-2">Продажа</th>
                  <th className="py-1.5 px-2 text-center">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCerts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-mono font-bold text-rose-700">{c.code}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{c.nominal.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700">{c.balance.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2">{c.soldTo || "—"}</td>
                    <td className="py-1.5 px-2">
                      {new Date(c.soldDate).toLocaleDateString("ru-RU")} · {paymentMethodLabel(c.salePaymentMethod)}
                    </td>
                    {renderCertActions(c)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed certificates */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Ban className="h-3.5 w-3.5 text-slate-400" />
          Закрытые сертификаты ({closedCerts.length})
        </h3>
        {closedCerts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Нет закрытых сертификатов</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-1.5 px-2">Номер</th>
                  <th className="py-1.5 px-2 text-right">Номинал</th>
                  <th className="py-1.5 px-2 text-right">Остаток</th>
                  <th className="py-1.5 px-2">Покупатель</th>
                  <th className="py-1.5 px-2">Продажа</th>
                  <th className="py-1.5 px-2">Причина</th>
                  {allowDeleteCertificates && (
                    <th className="py-1.5 px-2 text-center">Действие</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-500">
                {closedCerts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-2 font-mono font-bold text-slate-600">{c.code}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{c.nominal.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2 text-right font-mono">{c.balance.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2">{c.soldTo || "—"}</td>
                    <td className="py-1.5 px-2">
                      {new Date(c.soldDate).toLocaleDateString("ru-RU")} · {paymentMethodLabel(c.salePaymentMethod)}
                    </td>
                    <td className="py-1.5 px-2 text-[10px]">
                      {!c.isActive ? "Закрыт вручную" : "Использован полностью"}
                    </td>
                    {allowDeleteCertificates && renderCertActions(c)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open debts list */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-amber-500" />
          Должники ({openDebts.length})
        </h3>
        {openDebts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Нет открытых долгов</p>
        ) : (
          <div className="space-y-2">
            {openDebts.map((d) => (
              <div key={d.id} className="border border-amber-100 bg-amber-50/30 rounded p-2.5 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">{d.clientName}</div>
                  {d.clientPhone && <div className="text-[10px] text-slate-500">{d.clientPhone}</div>}
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    Визит {new Date(d.visitDate).toLocaleDateString("ru-RU")} · изначально {d.originalAmount.toLocaleString()} ₽
                  </div>
                  {d.payments.length > 0 && (
                    <div className="text-[9px] text-slate-500 mt-1">
                      Платежи: {d.payments.map((p) => `${p.amount} ₽ (${paymentMethodLabel(p.paymentMethod)}, ${new Date(p.date).toLocaleDateString("ru-RU")})`).join("; ")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-amber-700">{d.remainingAmount.toLocaleString()} ₽</div>
                  <div className="text-[9px] text-slate-400">остаток</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {closedDebts.length > 0 && (
        <details className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <summary className="text-xs font-bold uppercase text-slate-500 cursor-pointer">
            Закрытые долги ({closedDebts.length})
          </summary>
          <div className="mt-2 space-y-1 text-[10px] text-slate-500">
            {closedDebts.slice(0, 20).map((d) => (
              <div key={d.id} className="flex justify-between py-1 border-b border-slate-100">
                <span>{d.clientName}</span>
                <span className="font-mono">{d.originalAmount.toLocaleString()} ₽ — погашено</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
