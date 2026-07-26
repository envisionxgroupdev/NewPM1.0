import { useEffect, useRef, useState, useCallback } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | string;
  createdAt?: string;
  [key: string]: any;
}

export interface UseUserSyncOptions {
  currentUser: User | null;
  setCurrentUser: (user: User | null | ((prev: User | null) => User | null)) => void;
  intervalMs?: number; // Frequência de sincronização (padrão: 5000ms = 5 segundos)
  onRoleChanged?: (newRole: string, oldRole: string) => void;
  onUserLoggedOut?: () => void;
}

/**
 * Hook customizado para sincronizar o perfil do usuário logado periodicamente com o servidor/banco de dados.
 * Garante que alterações em tempo real (como mudanças de permissão admin/user ou atualizações de perfil)
 * reflitam instantaneamente na interface sem necessidade de recarregar a página.
 */
export function useUserSync({
  currentUser,
  setCurrentUser,
  intervalMs = 5000,
  onRoleChanged,
  onUserLoggedOut,
}: UseUserSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Utilizar ref para manter o usuário atualizado sem causar loops em useCallback
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const syncProfile = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user || !user.email) return;

    try {
      setIsSyncing(true);
      const response = await fetch(`/api/auth/me?email=${encodeURIComponent(user.email.trim())}`);

      // Caso o usuário tenha sido removido do servidor / banco de dados
      if (response.status === 404) {
        console.warn("Usuário não foi encontrado no servidor. Encerrando sessão...");
        setCurrentUser(null);
        localStorage.removeItem("pipocamax_user");
        if (onUserLoggedOut) onUserLoggedOut();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const updatedUser: User = data.user;
          const oldRole = user.role || "user";
          const newRole = updatedUser.role || "user";

          // Verificar se houve alteração no papel (role), nome ou e-mail
          if (
            updatedUser.role !== user.role ||
            updatedUser.name !== user.name ||
            updatedUser.email !== user.email
          ) {
            console.log(`[useUserSync] Perfil sincronizado! Role: "${oldRole}" -> "${newRole}"`);
            
            // Atualiza estado global e localStorage
            setCurrentUser(updatedUser);
            localStorage.setItem("pipocamax_user", JSON.stringify(updatedUser));

            // Notifica callback se a permissão/função mudou
            if (oldRole !== newRole && onRoleChanged) {
              onRoleChanged(newRole, oldRole);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[useUserSync] Erro de rede ao sincronizar perfil do usuário:", err);
    } finally {
      setIsSyncing(false);
      setLastSyncedAt(new Date());
    }
  }, [setCurrentUser, onRoleChanged, onUserLoggedOut]);

  // Efeito de Polling Periódico e Event Listeners de Foco
  useEffect(() => {
    if (!currentUser?.email) return;

    // Executa a primeira sincronização imediatamente ao montar ou logar
    syncProfile();

    // Sincronização periódica em segundo plano (padrão: 5s)
    const intervalId = setInterval(() => {
      syncProfile();
    }, intervalMs);

    // Re-sincroniza imediatamente quando o usuário volta para a aba da aplicação ou foca a janela
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        syncProfile();
      }
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, [currentUser?.email, intervalMs, syncProfile]);

  return {
    syncProfile,
    isSyncing,
    lastSyncedAt,
  };
}
