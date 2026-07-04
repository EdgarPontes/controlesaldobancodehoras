import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/useMobile";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Smartphone, X, Share2, Globe } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";
const iOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isInStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true));

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isInStandalone()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === "true") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (iOS && !isInStandalone()) {
      setShowPrompt(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  if (!isMobile || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <Card className="p-4 shadow-xl border-primary/10">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {iOS ? (
                  <Smartphone className="size-6 text-primary" />
                ) : (
                  <Download className="size-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold leading-tight">
                  Instale o Banco de Horas
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {iOS
                    ? "Toque no botão Compartilhar e depois em Adicionar à Tela de Início."
                    : "Instale o app para acesso rápido e uso offline."}
                </p>
                {iOS && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      1. <Share2 className="size-3.5" />
                    </span>
                    <span className="flex items-center gap-1">
                      2. <Globe className="size-3.5" />
                      Adicionar à Tela de Início
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {!iOS && deferredPrompt && (
                    <Button size="sm" onClick={handleInstall} className="gap-1.5">
                      <Download className="size-3.5" />
                      Instalar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={iOS ? "default" : "ghost"}
                    onClick={handleDismiss}
                    className={iOS ? "gap-1.5" : ""}
                  >
                    {iOS ? (
                      <>Entendi</>
                    ) : (
                      <>
                        <X className="size-3.5" />
                        Agora não
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {!iOS && (
                <button
                  onClick={handleDismiss}
                  className="shrink-0 p-1 hover:bg-accent rounded-md transition-colors"
                  aria-label="Fechar"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
