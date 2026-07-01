import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Import() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Acesso restrito</p>
      </div>
    );
  }

  const uploadExcel = trpc.import.uploadExcel.useMutation({
    onSuccess: (result) => {
      setIsLoading(false);
      if (result.success) {
        toast.success(`Importação concluída! ${result.importedRows} registros importados.`);
        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} erros encontrados durante a importação.`);
        }
        setTimeout(() => setLocation("/"), 1500);
      } else {
        toast.error("Erro ao importar: " + result.errors.join(", "));
      }
    },
    onError: (error) => {
      setIsLoading(false);
      toast.error("Erro ao importar arquivo: " + error.message);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      toast.error("Por favor, selecione um arquivo .xlsx");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const base64String = reader.result as string;
        // Remove the data URL prefix
        const base64Data = base64String.includes(",") 
          ? base64String.split(",")[1] 
          : base64String;
        
        toast.success("Importação iniciada. Isso pode levar alguns minutos...");
        await uploadExcel.mutateAsync({ fileData: base64Data });
      } catch (error) {
        toast.error("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo");
      setIsLoading(false);
    };
    
    reader.readAsDataURL(file)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/settings")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Importar Dados</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Carregue sua planilha de controle de ponto
            </p>
          </div>
        </div>

        {/* Import Card */}
        <div className="max-w-2xl">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Selecione seu arquivo</CardTitle>
              <CardDescription>
                Importe um arquivo .xlsx com seus registros de ponto históricos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Clique para selecionar ou arraste um arquivo
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Apenas arquivos .xlsx são aceitos
                </p>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    asChild
                    disabled={isLoading}
                    className="cursor-pointer"
                  >
                    <span>
                      {isLoading ? "Importando..." : "Selecionar Arquivo"}
                    </span>
                  </Button>
                </label>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Dica:</strong> O arquivo deve conter as colunas: Data, Hora Entrada, Hora Saída, etc.
                  Você pode usar a planilha de exemplo fornecida como referência.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
