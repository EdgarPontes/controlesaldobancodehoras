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
  return { totalBalanceMinutes: 0 };
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth() + 1;

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

  const monthName = new Date(Date.UTC(year, month - 1)).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setUTCMonth(newDate.getUTCMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setUTCMonth(newDate.getUTCMonth() + 1);
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
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Controle de Ponto</h1>
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
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatBalance(0)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Calculando...
                </p>
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
                            {new Date(Date.UTC(summary.year, summary.month - 1)).toLocaleString(
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