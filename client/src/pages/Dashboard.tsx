import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Settings } from "lucide-react";

// Utility functions to avoid importing server code in client
function formatBalance(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function calculateMonthlyBalance(year: number, month: number, entries: any[], workSettings: any): number {
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

  function calculateWorkedMinutes(t1: string | null | undefined, t2: string | null | undefined): number {
    if (!t1 || !t2) return 0;
    const tm1 = timeToMinutes(t1);
    const tm2 = timeToMinutes(t2);
    if (tm1 !== null && tm2 !== null && tm2 > tm1) {
      return tm2 - tm1;
    }
    return 0;
  }

  let totalBalanceMinutes = 0;

  entries.forEach((entry) => {
    const workedMinutes =
      calculateWorkedMinutes(entry.time1, entry.time2) +
      calculateWorkedMinutes(entry.time3, entry.time4) +
      calculateWorkedMinutes(entry.time5, entry.time6);

    const expectedMinutes = workSettings.weekdayHours * 60;
    totalBalanceMinutes += workedMinutes - expectedMinutes;
  });

  return totalBalanceMinutes;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const monthName = new Date(year, month - 1, 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const { data: workSettings } = trpc.workSettings.get.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: timeEntries } = trpc.timeEntries.getByMonth.useQuery(
    { year, month },
    {
      enabled: !!user,
    }
  );

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

  const cumulativeBalance = monthlySummaries?.reduce((sum: number, summary: any) => sum + (summary.totalMinutes || 0), 0) || 0;
  const currentMonthBalance = timeEntries ? calculateMonthlyBalance(year, month, timeEntries, workSettings || { weekdayHours: 8, saturdayHours: 4 }) : 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
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
                <div className={`text-3xl font-bold ${
                  currentMonthBalance > 0
                    ? "text-green-600 dark:text-green-400"
                    : currentMonthBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-900 dark:text-white"
                }`}>
                  {formatBalance(currentMonthBalance)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {monthName}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}