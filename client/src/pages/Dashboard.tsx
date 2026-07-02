import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { MonthlyTable } from "@/components/MonthlyTable";

// Utility functions to avoid importing server code in client
function formatBalance(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getBalanceStatus(minutes: number): "positive" | "negative" | "neutral" {
  if (minutes > 0) return "positive";
  if (minutes < 0) return "negative";
  return "neutral";
}

function calculateMonthlyBalance(year: number, month: number, entries: any[], workSettings: any) {
  // Helper functions for calculations
  function timeToMinutes(timeStr: string | null | undefined): number | null {
    if (!timeStr || typeof timeStr !== "string") return null;
    const trimmed = timeStr.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(":");
    if (parts.length < 2 || parts.length > 3) return null;
    try {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parts.length === 3 ? parseInt(parts[2], 10) : 0;
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
      if (hours < 0 || minutes < 0 || seconds < 0) return null;
      if (hours > 24 || minutes >= 60 || seconds >= 60) return null;
      return hours * 60 + minutes + Math.round(seconds / 60);
    } catch {
      return null;
    }
  }

  function calculateWorkedMinutes(t1: string | null | undefined, t2: string | null | undefined, t3: string | null | undefined, t4: string | null | undefined, t5: string | null | undefined, t6: string | null | undefined): number {
    let totalMinutes = 0;
    if (t1 && t2) {
      const tm1 = timeToMinutes(t1);
      const tm2 = timeToMinutes(t2);
      if (tm1 !== null && tm2 !== null && tm2 > tm1) {
        totalMinutes += tm2 - tm1;
      }
    }
    if (t3 && t4) {
      const tm3 = timeToMinutes(t3);
      const tm4 = timeToMinutes(t4);
      if (tm3 !== null && tm4 !== null && tm4 > tm3) {
        totalMinutes += tm4 - tm3;
      }
    }
    if (t5 && t6) {
      const tm5 = timeToMinutes(t5);
      const tm6 = timeToMinutes(t6);
      if (tm5 !== null && tm6 !== null && tm6 > tm5) {
        totalMinutes += tm6 - tm5;
      }
    }
    return totalMinutes;
  }

  function getDayOfWeek(dateStr: string): number {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.getUTCDay();
  }

  function isSunday(dateStr: string): boolean {
    return getDayOfWeek(dateStr) === 0;
  }

  function isSaturday(dateStr: string): boolean {
    return getDayOfWeek(dateStr) === 6;
  }

  function getExpectedMinutes(dateStr: string, weekdayHours: number, saturdayHours: number): number {
    if (isSunday(dateStr)) {
      return 0;
    }
    const isSat = isSaturday(dateStr);
    const hours = isSat ? saturdayHours : weekdayHours;
    return hours * 60;
  }

  function getDaysInMonth(yr: number, mth: number): number {
    return new Date(yr, mth, 0).getDate();
  }

  function calculateDailyBalance(workedMinutes: number, expectedMinutes: number, dayType: string): number {
    if (dayType !== "normal") {
      return 0;
    }
    return workedMinutes - expectedMinutes;
  }

  const daysInMonth = getDaysInMonth(year, month);
  const days: any[] = [];
  let totalBalanceMinutes = 0;
  let totalWorkedMinutes = 0;
  let totalExpectedMinutes = 0;

  const entriesByDate = new Map<string, any>();
  entries.forEach((entry: any) => {
    entriesByDate.set(entry.date, entry);
  });

  const relevantDates = entries
    .map((entry: any) => entry.date)
    .sort((a: string, b: string) => a.localeCompare(b));

  relevantDates.forEach((dateStr: string) => {
    const entry = entriesByDate.get(dateStr) || null;
    const hasAnyTime = [entry?.time1, entry?.time2, entry?.time3, entry?.time4, entry?.time5, entry?.time6].some(Boolean);
    const hasSpecialDayType = entry?.dayType && entry.dayType !== "normal";
    const hasNotes = Boolean(entry?.notes);

    if (!hasAnyTime && !hasSpecialDayType && !hasNotes) {
      return;
    }

    const workedMinutes = entry
      ? calculateWorkedMinutes(entry.time1, entry.time2, entry.time3, entry.time4, entry.time5, entry.time6)
      : 0;

    const expectedMinutes = getExpectedMinutes(dateStr, workSettings.weekdayHours, workSettings.saturdayHours);
    const dayType = entry?.dayType || "normal";
    const balanceMinutes = calculateDailyBalance(workedMinutes, expectedMinutes, dayType);

    days.push({ date: dateStr, balanceMinutes });
    totalBalanceMinutes += balanceMinutes;
    totalWorkedMinutes += workedMinutes;
    totalExpectedMinutes += expectedMinutes;
  });

  return {
    year,
    month,
    days,
    totalBalanceMinutes,
    totalWorkedMinutes,
    totalExpectedMinutes,
  };
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Fetch work settings
  const { data: workSettings } = trpc.workSettings.get.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch time entries for current month
  const { data: timeEntries } = trpc.timeEntries.getByMonth.useQuery(
    { year, month },
    {
      enabled: !!user,
    }
  );

  // Fetch all monthly summaries
  const { data: monthlySummaries } = trpc.summary.getAllMonthly.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>Faça login para acessar o controle de ponto</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const monthName = new Date(year, month - 1, 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Calculate cumulative balance
  const cumulativeBalance = monthlySummaries?.reduce((sum: number, summary: any) => sum + (summary.totalMinutes || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Bem-vindo, {user.name}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/settings")}
              className="rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Saldo Acumulado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
                  cumulativeBalance > 0
                    ? "text-green-600 dark:text-green-400"
                    : cumulativeBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-900 dark:text-white"
                }`}>
                  {formatBalance(cumulativeBalance)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {monthlySummaries?.length || 0} meses registrados
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Carga Horária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {workSettings?.weekdayHours}h / {workSettings?.saturdayHours}h
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Seg-Sex / Sábado
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Mês Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeEntries && workSettings ? (() => {
                  const monthBalance = calculateMonthlyBalance(year, month, timeEntries, workSettings);
                  return (
                    <>
                      <div className={`text-3xl font-bold ${
                        monthBalance.totalBalanceMinutes > 0
                          ? "text-green-600 dark:text-green-400"
                          : monthBalance.totalBalanceMinutes < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-900 dark:text-white"
                      }`}>
                        {formatBalance(monthBalance.totalBalanceMinutes)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {timeEntries.length} registros
                      </p>
                    </>
                  );
                })() : (
                  <>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatBalance(0)}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Carregando...</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="month" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="month">Visualização Mensal</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{monthName}</CardTitle>
                      <CardDescription>Registros de ponto e saldo diário</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {timeEntries && workSettings ? (
                    <MonthlyTable
                      year={year}
                      month={month}
                      entries={timeEntries}
                      weekdayHours={workSettings.weekdayHours}
                      saturdayHours={workSettings.saturdayHours}
                      totalBalance={calculateMonthlyBalance(year, month, timeEntries, workSettings).totalBalanceMinutes}
                    />
                  ) : (
                    <div className="text-center py-8 text-slate-500">Carregando...</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Histórico de Meses</CardTitle>
                  <CardDescription>Saldo acumulado por mês</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlySummaries && monthlySummaries.length > 0 ? (
                    <div className="space-y-2">
                      {monthlySummaries?.map((summary: any) => (
                        <div
                          key={`${summary.year}-${summary.month}`}
                          className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900"
                        >
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {new Date(summary.year, summary.month - 1, 1).toLocaleString(
                              "pt-BR",
                              { month: "long", year: "numeric" }
                            )}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              summary.totalMinutes > 0
                                ? "text-green-600 dark:text-green-400"
                                : summary.totalMinutes < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {formatBalance(summary.totalMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Nenhum registro encontrado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}