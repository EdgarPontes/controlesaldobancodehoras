import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeInput } from "@/components/TimeInput";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, CalendarPlus, Layers } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch work settings
  const { data: workSettings, isLoading } = trpc.workSettings.get.useQuery(undefined, {
    enabled: !!user,
  });

  const [weekdayHours, setWeekdayHours] = useState<number>(8);
  const [saturdayHours, setSaturdayHours] = useState<number>(4);
  const [bankPeriod, setBankPeriod] = useState<"monthly" | "semesterly">("monthly");
  const [isSaving, setIsSaving] = useState(false);

  // Default times state
  const [defaultWeekdayTime1, setDefaultWeekdayTime1] = useState<string | null>(null);
  const [defaultWeekdayTime2, setDefaultWeekdayTime2] = useState<string | null>(null);
  const [defaultWeekdayTime3, setDefaultWeekdayTime3] = useState<string | null>(null);
  const [defaultWeekdayTime4, setDefaultWeekdayTime4] = useState<string | null>(null);
  const [defaultWeekdayTime5, setDefaultWeekdayTime5] = useState<string | null>(null);
  const [defaultWeekdayTime6, setDefaultWeekdayTime6] = useState<string | null>(null);

  const [defaultSaturdayTime1, setDefaultSaturdayTime1] = useState<string | null>(null);
  const [defaultSaturdayTime2, setDefaultSaturdayTime2] = useState<string | null>(null);
  const [defaultSaturdayTime3, setDefaultSaturdayTime3] = useState<string | null>(null);
  const [defaultSaturdayTime4, setDefaultSaturdayTime4] = useState<string | null>(null);
  const [defaultSaturdayTime5, setDefaultSaturdayTime5] = useState<string | null>(null);
  const [defaultSaturdayTime6, setDefaultSaturdayTime6] = useState<string | null>(null);

  // Populate mutations
  const utils = trpc.useUtils();
  const populateMonth = trpc.populateWithDefaults.populateMonth.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.timeEntries.getByMonth.invalidate();
      utils.summary.getAllMonthly.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const populateSemester = trpc.populateWithDefaults.populateSemester.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.timeEntries.getByMonth.invalidate();
      utils.summary.getAllMonthly.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update local state when data loads
  useEffect(() => {
    if (workSettings) {
      setWeekdayHours(workSettings.weekdayHours);
      setSaturdayHours(workSettings.saturdayHours);
      setBankPeriod(workSettings.bankPeriod as "monthly" | "semesterly");
      setDefaultWeekdayTime1(workSettings.defaultWeekdayTime1 || null);
      setDefaultWeekdayTime2(workSettings.defaultWeekdayTime2 || null);
      setDefaultWeekdayTime3(workSettings.defaultWeekdayTime3 || null);
      setDefaultWeekdayTime4(workSettings.defaultWeekdayTime4 || null);
      setDefaultWeekdayTime5(workSettings.defaultWeekdayTime5 || null);
      setDefaultWeekdayTime6(workSettings.defaultWeekdayTime6 || null);
      setDefaultSaturdayTime1(workSettings.defaultSaturdayTime1 || null);
      setDefaultSaturdayTime2(workSettings.defaultSaturdayTime2 || null);
      setDefaultSaturdayTime3(workSettings.defaultSaturdayTime3 || null);
      setDefaultSaturdayTime4(workSettings.defaultSaturdayTime4 || null);
      setDefaultSaturdayTime5(workSettings.defaultSaturdayTime5 || null);
      setDefaultSaturdayTime6(workSettings.defaultSaturdayTime6 || null);
    }
  }, [workSettings]);

  const updateSettings = trpc.workSettings.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
      setIsSaving(false);
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings.mutateAsync({
      weekdayHours,
      saturdayHours,
      bankPeriod,
      defaultWeekdayTime1,
      defaultWeekdayTime2,
      defaultWeekdayTime3,
      defaultWeekdayTime4,
      defaultWeekdayTime5,
      defaultWeekdayTime6,
      defaultSaturdayTime1,
      defaultSaturdayTime2,
      defaultSaturdayTime3,
      defaultSaturdayTime4,
      defaultSaturdayTime5,
      defaultSaturdayTime6,
    });
  };

  const handlePopulateMonth = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await populateMonth.mutateAsync({ year, month });
  };

  const handlePopulateSemester = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const isFirstSemester = month <= 6;
    const months = isFirstSemester ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
    await populateSemester.mutateAsync({ year, months });
  };

  if (!user) {
    return null;
  }

  const hasDefaultTimes = [
    defaultWeekdayTime1,
    defaultWeekdayTime2,
    defaultWeekdayTime3,
    defaultWeekdayTime4,
    defaultWeekdayTime5,
    defaultWeekdayTime6,
    defaultSaturdayTime1,
    defaultSaturdayTime2,
    defaultSaturdayTime3,
    defaultSaturdayTime4,
    defaultSaturdayTime5,
    defaultSaturdayTime6,
  ].some(Boolean);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Personalize suas preferências</p>
            </div>
          </div>

          {/* Settings Cards */}
          <div className="max-w-2xl space-y-6">
            {/* Work Hours Settings */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Carga Horária e Banco de Horas</CardTitle>
                <CardDescription>
                  Configure as horas esperadas por dia de trabalho e o período de acúmulo das horas extras
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weekday-hours" className="text-sm font-medium">
                      Segunda a Sexta
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="weekday-hours"
                        type="number"
                        min="1"
                        max="24"
                        value={weekdayHours}
                        onChange={(e) => setWeekdayHours(parseInt(e.target.value) || 8)}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">horas</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="saturday-hours" className="text-sm font-medium">
                      Sábado
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="saturday-hours"
                        type="number"
                        min="1"
                        max="24"
                        value={saturdayHours}
                        onChange={(e) => setSaturdayHours(parseInt(e.target.value) || 4)}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">horas</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label htmlFor="bank-period" className="text-sm font-medium">
                    Período do Banco de Horas
                  </Label>
                  <Select
                    value={bankPeriod}
                    onValueChange={(val) => setBankPeriod(val as "monthly" | "semesterly")}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="bank-period" className="w-full">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal (Zera o banco todo mês)</SelectItem>
                      <SelectItem value="semesterly">Semestral (Acumula durante o semestre)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Isso afeta o cálculo do Saldo Acumulado no painel principal e agrupamentos no histórico.
                  </p>
                </div>

                <Separator />

                {/* Default Times Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Horários Padrão
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Defina os horários padrão para popular dias rapidamente. Após salvar, use os botões abaixo para preencher um mês ou semestre inteiro.
                    </p>
                  </div>

                  {/* Weekday Default Times */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Dias de Semana (Seg-Sex)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeInput
                        label="Entrada"
                        value={defaultWeekdayTime1}
                        onChange={setDefaultWeekdayTime1}
                        placeholder="HH:MM"
                      />
                      <TimeInput
                        label="Saída Almoço"
                        value={defaultWeekdayTime2}
                        onChange={setDefaultWeekdayTime2}
                        placeholder="HH:MM"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeInput
                        label="Retorno Almoço"
                        value={defaultWeekdayTime3}
                        onChange={setDefaultWeekdayTime3}
                        placeholder="HH:MM"
                      />
                      <TimeInput
                        label="Saída"
                        value={defaultWeekdayTime4}
                        onChange={setDefaultWeekdayTime4}
                        placeholder="HH:MM"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeInput
                        label="Extra Entrada"
                        value={defaultWeekdayTime5}
                        onChange={setDefaultWeekdayTime5}
                        placeholder="HH:MM"
                      />
                      <TimeInput
                        label="Extra Saída"
                        value={defaultWeekdayTime6}
                        onChange={setDefaultWeekdayTime6}
                        placeholder="HH:MM"
                      />
                    </div>
                  </div>

                  {/* Saturday Default Times */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Sábado
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeInput
                        label="Entrada"
                        value={defaultSaturdayTime1}
                        onChange={setDefaultSaturdayTime1}
                        placeholder="HH:MM"
                      />
                      <TimeInput
                        label="Saída Almoço"
                        value={defaultSaturdayTime2}
                        onChange={setDefaultSaturdayTime2}
                        placeholder="HH:MM"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeInput
                        label="Retorno Almoço"
                        value={defaultSaturdayTime3}
                        onChange={setDefaultSaturdayTime3}
                        placeholder="HH:MM"
                      />
                      <TimeInput
                        label="Saída"
                        value={defaultSaturdayTime4}
                        onChange={setDefaultSaturdayTime4}
                        placeholder="HH:MM"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeInput
                        label="Extra Entrada"
                        value={defaultSaturdayTime5}
                        onChange={setDefaultSaturdayTime5}
                        placeholder="HH:MM"
                      />
                      <TimeInput
                        label="Extra Saída"
                        value={defaultSaturdayTime6}
                        onChange={setDefaultSaturdayTime6}
                        placeholder="HH:MM"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </CardContent>
            </Card>

            {/* Populate Actions Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Popular Registros</CardTitle>
                <CardDescription>
                  Preencha automaticamente os dias com os horários padrão configurados acima
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePopulateMonth}
                    disabled={!hasDefaultTimes || populateMonth.isPending}
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    {populateMonth.isPending ? "Populando..." : "Popular Mês Atual"}
                  </Button>

                  {bankPeriod === "semesterly" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePopulateSemester}
                      disabled={!hasDefaultTimes || populateSemester.isPending}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      {populateSemester.isPending ? "Populando..." : "Popular Semestre Inteiro"}
                    </Button>
                  )}
                </div>

                {!hasDefaultTimes && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                    Configure e salve os horários padrão acima primeiro.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Import Data */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Importar Dados</CardTitle>
                <CardDescription>
                  Importe seus registros históricos de ponto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/import")}
                >
                  Importar Planilha
                </Button>
              </CardContent>
            </Card>

            {/* User Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Informações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Nome</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Email</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400">Membro desde</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}