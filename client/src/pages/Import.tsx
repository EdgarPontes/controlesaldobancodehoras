import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function Import() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const importMutation = trpc.import.uploadExcel.useMutation({
    onSuccess: (result) => {
      toast.success(`Importados ${result.imported} registros com sucesso!`);
      setIsUploading(false);
      setFile(null);
      // Redirect to dashboard after successful import
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUploading(false);
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Selecione um arquivo Excel");
      return;
    }

    setIsUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      await importMutation.mutateAsync({ fileData: base64 });
    } catch (error) {
      toast.error("Erro ao ler arquivo");
      setIsUploading(false);
    }
  }, [file, importMutation]);

  return (
    <DashboardLayout>
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
              <p className="text-slate-600 dark:text-slate-400 mt-1">Importe seus registros históricos de ponto</p>
            </div>
          </div>

          {/* Import Card */}
          <Card className="border-0 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle>Importar Planilha Excel</CardTitle>
              <CardDescription>
                Selecione um arquivo Excel (.xlsx) com seus registros de ponto para importar.
                O arquivo deve conter as colunas: Data, Entrada 1, Saída 1, Entrada 2, Saída 2, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="excel-file" className="text-sm font-medium">
                    Arquivo Excel
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                  </div>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!file || isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Arquivo
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}