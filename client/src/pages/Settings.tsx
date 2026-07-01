import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch work settings
  const { data: workSettings, isLoading } = trpc.workSettings.get.useQuery(undefined, {
    enabled: !!user,
  });

  const [weekdayHours, setWeekdayHours] = useState<number>(8);
  const [saturdayHours, setSaturdayHours] = useState<number>(4);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when data loads
  React.useEffect(() => {
    if (workSettings) {
      setWeekdayHours(workSettings.weekdayHours);
      setSaturdayHours(workSettings.saturdayHours);
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
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Personalize suas preferências</p>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="max-w-2xl space-y-6">
          {/* Work Hours Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Carga Horária</CardTitle>
              <CardDescription>
                Configure as horas esperadas por dia de trabalho
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="weekday-hours" className="text-sm font-medium">
                    Horas - Segunda a Sexta
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
                    Horas - Sábado
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
  );
}

import React from "react";
