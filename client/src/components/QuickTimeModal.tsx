import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Clock, ArrowRightToLine, ArrowLeftFromLine, Utensils, ArrowUpFromLine, Timer } from "lucide-react";

interface QuickTimeModalProps {
    date: string;
    open: boolean;
    onClose: () => void;
}

const quickTimeOptions = [
    { label: "Entrada", field: "time1" as const, icon: ArrowRightToLine, color: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" },
    { label: "Saída Almoço", field: "time2" as const, icon: ArrowLeftFromLine, color: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" },
    { label: "Retorno Almoço", field: "time3" as const, icon: Utensils, color: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" },
    { label: "Saída", field: "time4" as const, icon: ArrowUpFromLine, color: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300" },
    { label: "Extra Entrada", field: "time5" as const, icon: Timer, color: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300" },
    { label: "Extra Saída", field: "time6" as const, icon: Clock, color: "bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950 dark:hover:bg-cyan-900 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300" },
];

export function QuickTimeModal({ date, open, onClose }: QuickTimeModalProps) {
    const utils = trpc.useUtils();

    const updateMutation = trpc.timeEntries.update.useMutation({
        onSuccess: () => {
            toast.success("Horário registrado com sucesso!");
            utils.timeEntries.getByMonth.invalidate();
            utils.summary.getAllMonthly.invalidate();
            onClose();
        },
        onError: (error) => {
            toast.error("Erro ao salvar: " + error.message);
        },
    });

    const handleQuickTime = (field: "time1" | "time2" | "time3" | "time4" | "time5" | "time6") => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        updateMutation.mutateAsync({
            date,
            [field]: currentTime,
        });
    };

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    };

    return (
        <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        Registrar horário - {formatDate(date)}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-4">
                    {quickTimeOptions.map((option) => (
                        <Button
                            key={option.field}
                            variant="outline"
                            onClick={() => handleQuickTime(option.field)}
                            disabled={updateMutation.isPending}
                            className={`h-20 flex flex-col items-center justify-center gap-2 border-2 ${option.color} transition-all`}
                        >
                            <option.icon className="h-5 w-5" />
                            <span className="text-xs font-semibold">{option.label}</span>
                            <span className="text-[10px] font-mono opacity-80">
                                {updateMutation.isPending ? "Salvando..." : "Agora"}
                            </span>
                        </Button>
                    ))}
                </div>
                <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                    Selecione o campo onde deseja registrar o horário atual
                </p>
            </DialogContent>
        </Dialog>
    );
}