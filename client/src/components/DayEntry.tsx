import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeInput } from "./TimeInput";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatBalance, getBalanceStatus } from "../../../server/balanceCalculator";
import { calculateWorkedMinutes, getExpectedMinutes } from "../../../server/timeCalculations";

interface DayEntryProps {
  date: string;
  dayOfWeek: number;
  initialData?: {
    time1?: string | null;
    time2?: string | null;
    time3?: string | null;
    time4?: string | null;
    time5?: string | null;
    time6?: string | null;
    dayType?: string;
    notes?: string | null;
  };
  weekdayHours: number;
  saturdayHours: number;
  onClose?: () => void;
}

const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function DayEntry({
  date,
  dayOfWeek,
  initialData,
  weekdayHours,
  saturdayHours,
  onClose,
}: DayEntryProps) {
  const [time1, setTime1] = useState<string | null>(initialData?.time1 || null);
  const [time2, setTime2] = useState<string | null>(initialData?.time2 || null);
  const [time3, setTime3] = useState<string | null>(initialData?.time3 || null);
  const [time4, setTime4] = useState<string | null>(initialData?.time4 || null);
  const [time5, setTime5] = useState<string | null>(initialData?.time5 || null);
  const [time6, setTime6] = useState<string | null>(initialData?.time6 || null);
  const [dayType, setDayType] = useState(initialData?.dayType || "normal");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const updateMutation = trpc.timeEntries.update.useMutation({
    onSuccess: () => {
      toast.success("Registro salvo com sucesso!");
      onClose?.();
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      date,
      time1,
      time2,
      time3,
      time4,
      time5,
      time6,
      dayType: dayType as any,
      notes: notes || null,
    });
  };

  // Calculate balance
  const workedMinutes = calculateWorkedMinutes(time1, time2, time3, time4, time5, time6);
  const expectedMinutes = getExpectedMinutes(date, weekdayHours, saturdayHours);
  const balanceMinutes = dayType === "normal" ? workedMinutes - expectedMinutes : 0;
  const balanceStatus = getBalanceStatus(balanceMinutes);

  // Calculate extra hours (time5 to time6, or any overtime beyond 8 hours for the day)
  let extraMinutes = 0;
  if (time5 && time6) {
    const t5 = parseInt(time5.split(":")[0]) * 60 + parseInt(time5.split(":")[1]);
    const t6 = parseInt(time6.split(":")[0]) * 60 + parseInt(time6.split(":")[1]);
    if (t6 > t5) {
      extraMinutes = t6 - t5;
    }
  } else if (workedMinutes > expectedMinutes && expectedMinutes > 0) {
    // If no explicit extra times, show the excess hours worked
    extraMinutes = workedMinutes - expectedMinutes;
  }
  const extraStatus = getBalanceStatus(extraMinutes);

  const isSunday = dayOfWeek === 0;

  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {dayNames[dayOfWeek]} - {date}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Esperado: {expectedMinutes > 0 ? `${Math.floor(expectedMinutes / 60)}h` : "Folga"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Type */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Tipo de Dia
          </label>
          <Select value={dayType} onValueChange={setDayType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Dia Normal</SelectItem>
              <SelectItem value="holiday">Feriado</SelectItem>
              <SelectItem value="leave">Folga</SelectItem>
              <SelectItem value="justified_absence">Ausência Justificada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Times - Only show if not Sunday and not special day type */}
        {!isSunday && dayType === "normal" && (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Horários
              </h4>

              {/* Morning shift */}
              <div className="grid grid-cols-2 gap-2">
                <TimeInput
                  label="Entrada"
                  value={time1}
                  onChange={setTime1}
                  placeholder="HH:MM"
                />
                <TimeInput
                  label="Saída Almoço"
                  value={time2}
                  onChange={setTime2}
                  placeholder="HH:MM"
                />
              </div>

              {/* Afternoon shift */}
              <div className="grid grid-cols-2 gap-2">
                <TimeInput
                  label="Retorno Almoço"
                  value={time3}
                  onChange={setTime3}
                  placeholder="HH:MM"
                />
                <TimeInput
                  label="Saída"
                  value={time4}
                  onChange={setTime4}
                  placeholder="HH:MM"
                />
              </div>

              {/* Extra times */}
              <div className="grid grid-cols-2 gap-2">
                <TimeInput
                  label="Extra Entrada"
                  value={time5}
                  onChange={setTime5}
                  placeholder="HH:MM"
                />
                <TimeInput
                  label="Extra Saída"
                  value={time6}
                  onChange={setTime6}
                  placeholder="HH:MM"
                />
              </div>
            </div>

            {/* Balance display */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Horas Extras:
                </span>
                <span
                  className={`text-lg font-bold ${extraStatus === "positive"
                    ? "text-green-600 dark:text-green-400"
                    : extraStatus === "negative"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-900 dark:text-white"
                    }`}
                >
                  {formatBalance(extraMinutes)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
            Observações
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione notas sobre este dia..."
            className="resize-none h-20"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}
