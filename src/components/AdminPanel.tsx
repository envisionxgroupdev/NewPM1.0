import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Film, Tv, Sparkles, Plus, Edit, Trash2, Shield, Users, Check, X,
  FileSpreadsheet, Database, Sparkle, AlertTriangle, Loader2, Settings,
  Search, Filter, RotateCcw, Star, Zap, CheckCircle2,
  Eye, EyeOff, Play, Square, Flag, UserPlus, User,
  Bell, Send, Radio, Wrench, ShieldAlert, Ban, Unlock, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from "recharts";
import { Movie } from "../types";
import MaintenanceScreen from "./MaintenanceScreen";

interface AdminPanelProps {
  movies: Movie[];
  onMoviesUpdated: () => void;
  currentUser: any;
}

export default function AdminPanel({ movies, onMoviesUpdated, currentUser }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"catalog" | "users" | "notifications" | "reports" | "stats" | "settings">("catalog");
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Notification states
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifTarget, setNotifTarget] = useState<"all" | "users" | "admins" | "specific">("all");
  const [notifTargetEmail, setNotifTargetEmail] = useState("");
  const [notifType, setNotifType] = useState<"info" | "success" | "warning" | "alert">("info");
  const [notifAttachedMovieId, setNotifAttachedMovieId] = useState("");
  const [notifSubmitting, setNotifSubmitting] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Reports states
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFilter, setReportsFilter] = useState<"todos" | "Pendente" | "Em Análise" | "Resolvido">("todos");
  const [reportsSearchQuery, setReportsSearchQuery] = useState("");
  const [replyingReportId, setReplyingReportId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<string>("Resolvido");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Title Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [type, setType] = useState<"filme" | "serie" | "anime">("filme");
  const [year, setYear] = useState(2026);
  const [duration, setDuration] = useState("120 min");
  const [rating, setRating] = useState(8.0);
  const [genres, setGenres] = useState("Ação, Aventura");
  const [synopsis, setSynopsis] = useState("");
  const [backdropUrl, setBackdropUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [trailerVideoId, setTrailerVideoId] = useState("");
  const [cast, setCast] = useState("");
  const [director, setDirector] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imdbId, setImdbId] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Catalog search and filter states
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<"todos" | "filme" | "serie" | "anime">("todos");
  const [catalogGenreFilter, setCatalogGenreFilter] = useState("todos");
  const [catalogPage, setCatalogPage] = useState(1);
  const CATALOG_PAGE_SIZE = 20;

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"todos" | "admin" | "user" | "banned">("todos");
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PAGE_SIZE = 20;

  // User Add/Edit Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userNameInput, setUserNameInput] = useState("");
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userPasswordInput, setUserPasswordInput] = useState("");
  const [userRoleInput, setUserRoleInput] = useState<"user" | "admin">("user");
  const [userModalError, setUserModalError] = useState("");
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);

  // TMDB Import Modal states
  const [isTmdbSearchOpen, setIsTmdbSearchOpen] = useState(false);
  const [tmdbApiKey, setTmdbApiKey] = useState(() => localStorage.getItem("tmdb_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState("");
  const [tmdbSearchYear, setTmdbSearchYear] = useState("2026");
  const [tmdbSearchType, setTmdbSearchType] = useState<"todos" | "filme" | "serie" | "anime">("todos");
  const [tmdbPage, setTmdbPage] = useState(1);
  const [tmdbTotalPages, setTmdbTotalPages] = useState(1);
  const [tmdbTotalResults, setTmdbTotalResults] = useState(0);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [directImportingId, setDirectImportingId] = useState<string | null>(null);
  const [addedTmdbIds, setAddedTmdbIds] = useState<string[]>([]);

  // Batch Auto-Import states
  const [importTab, setImportTab] = useState<"search" | "batch">("search");
  const [batchTargetCount, setBatchTargetCount] = useState<number>(10);
  const [batchType, setBatchType] = useState<"todos" | "filme" | "serie" | "anime">("todos");
  const [batchYear, setBatchYear] = useState<string>("2026");
  const [batchRunning, setBatchRunning] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
    addedCount: number;
    errorCount: number;
  } | null>(null);
  const [batchResultSummary, setBatchResultSummary] = useState<{
    added: number;
    titles: string[];
  } | null>(null);
  const batchCancelledRef = useRef<boolean>(false);

  // Toast notification state
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Custom Confirmation Modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Set of all existing TMDB IDs, IMDb IDs, and normalized titles for complete duplicate prevention
  const existingCatalogKeys = useMemo(() => {
    const tmdbSet = new Set<string>();
    const imdbSet = new Set<string>();
    const titleSet = new Set<string>();

    const normalize = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";

    movies.forEach(m => {
      if (m.tmdbId) tmdbSet.add(String(m.tmdbId));
      if (m.imdbId) imdbSet.add(String(m.imdbId));
      if (m.title) titleSet.add(normalize(m.title));
      if (m.originalTitle) titleSet.add(normalize(m.originalTitle));
    });

    addedTmdbIds.forEach(id => tmdbSet.add(String(id)));

    return { tmdbSet, imdbSet, titleSet, normalize };
  }, [movies, addedTmdbIds]);

  const isAlreadyInCatalog = (item: any) => {
    if (!item) return false;
    const itemId = String(item.tmdbId || item.id || "");
    const imdbId = String(item.imdbId || "");
    const title = item.title || item.name || "";
    const originalTitle = item.originalTitle || item.original_title || item.original_name || "";

    const { tmdbSet, imdbSet, titleSet, normalize } = existingCatalogKeys;

    if (itemId && tmdbSet.has(itemId)) return true;
    if (imdbId && imdbSet.has(imdbId)) return true;
    if (title && titleSet.has(normalize(title))) return true;
    if (originalTitle && titleSet.has(normalize(originalTitle))) return true;

    return false;
  };

  // Get dynamic unique genres from all movies
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    movies.forEach((m) => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach((g) => genreSet.add(g));
      }
    });
    return ["todos", ...Array.from(genreSet).sort()];
  }, [movies]);

  // Filtered movies to display in the catalog table
  const filteredCatalogMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchSearch = 
        m.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(catalogSearch.toLowerCase()));
      const matchType = catalogTypeFilter === "todos" || m.type === catalogTypeFilter;
      const matchGenre = catalogGenreFilter === "todos" || (Array.isArray(m.genres) && m.genres.includes(catalogGenreFilter));
      return matchSearch && matchType && matchGenre;
    });
  }, [movies, catalogSearch, catalogTypeFilter, catalogGenreFilter]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearch, catalogTypeFilter, catalogGenreFilter]);

  const totalCatalogPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCatalogMovies.length / CATALOG_PAGE_SIZE)),
    [filteredCatalogMovies.length, CATALOG_PAGE_SIZE]
  );

  const paginatedCatalogMovies = useMemo(() => {
    const startIndex = (catalogPage - 1) * CATALOG_PAGE_SIZE;
    return filteredCatalogMovies.slice(startIndex, startIndex + CATALOG_PAGE_SIZE);
  }, [filteredCatalogMovies, catalogPage, CATALOG_PAGE_SIZE]);

  // Filtered users for admin panel (strictly deduplicated by ID to ensure unique React keys)
  const filteredUsers = useMemo(() => {
    let list = users;

    if (userSearchTerm.trim()) {
      const q = userSearchTerm.toLowerCase();
      list = list.filter((u: any) => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    if (userRoleFilter === "banned") {
      list = list.filter((u: any) => u.status === "banned");
    } else if (userRoleFilter !== "todos") {
      list = list.filter((u: any) => u.role === userRoleFilter && u.status !== "banned");
    }

    const seen = new Set<string>();
    return list.filter((u: any) => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [users, userSearchTerm, userRoleFilter]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearchTerm, userRoleFilter]);

  const totalUsersPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE)),
    [filteredUsers.length, USERS_PAGE_SIZE]
  );

  const paginatedUsers = useMemo(() => {
    const startIndex = (usersPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PAGE_SIZE);
  }, [filteredUsers, usersPage, USERS_PAGE_SIZE]);

  // Stats calculations for Recharts
  const genreData = useMemo(() => {
    const counts: Record<string, number> = {};
    movies.forEach((m) => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach((g) => {
          counts[g] = (counts[g] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 genres
  }, [movies]);

  const typeData = useMemo(() => {
    const filmCount = movies.filter(m => m.type === "filme").length;
    const serieCount = movies.filter(m => m.type === "serie").length;
    const animeCount = movies.filter(m => m.type === "anime").length;
    return [
      { name: "Filmes", value: filmCount, color: "#e50914" },
      { name: "Séries", value: serieCount, color: "#a855f7" },
      { name: "Animes", value: animeCount, color: "#f59e0b" }
    ].filter(t => t.value > 0);
  }, [movies]);

  const ratingDistribution = useMemo(() => {
    const bins = {
      "Nota 9.0+": 0,
      "Nota 8.0-8.9": 0,
      "Nota 7.0-7.9": 0,
      "Nota 6.0-6.9": 0,
      "Nota < 6.0": 0
    };
    movies.forEach((m) => {
      const r = m.rating;
      if (r >= 9.0) bins["Nota 9.0+"]++;
      else if (r >= 8.0) bins["Nota 8.0-8.9"]++;
      else if (r >= 7.0) bins["Nota 7.0-7.9"]++;
      else if (r >= 6.0) bins["Nota 6.0-6.9"]++;
      else bins["Nota < 6.0"]++;
    });
    return Object.entries(bins).map(([name, value]) => ({ name, value }));
  }, [movies]);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState({ success: "", error: "" });

  // System Maintenance Mode states
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintTitle, setMaintTitle] = useState("Estamos em Manutenção Programada ⚙️");
  const [maintMessage, setMaintMessage] = useState("Estamos realizando atualizações e melhorias gerais em nossos servidores e catálogo de mídia para oferecer uma reprodução muito mais estável e veloz. Voltaremos em breve!");
  const [maintReturn, setMaintReturn] = useState("Em breve (Algumas horas)");
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintFeedback, setMaintFeedback] = useState({ success: "", error: "" });
  const [maintPreviewOpen, setMaintPreviewOpen] = useState(false);

  const handleSaveMaintenanceToDb = async () => {
    setMaintSaving(true);
    setMaintFeedback({ success: "", error: "" });
    try {
      const response = await fetch("/api/settings/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({
          enabled: maintEnabled,
          title: maintTitle,
          message: maintMessage,
          estimatedReturn: maintReturn
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMaintFeedback({ success: data.message || "Modo de manutenção atualizado!", error: "" });
        showToast(data.message || "Modo de manutenção atualizado!", "success");
      } else {
        setMaintFeedback({ success: "", error: data.error || "Erro ao atualizar modo de manutenção." });
      }
    } catch (err: any) {
      setMaintFeedback({ success: "", error: "Erro de conexão: " + err.message });
    } finally {
      setMaintSaving(false);
    }
  };

  const handleSaveSettingsToDb = async () => {
    setSavingSettings(true);
    setSettingsFeedback({ success: "", error: "" });
    try {
      const response = await fetch("/api/settings/tmdb", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({ apiKey: tmdbApiKey })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSettingsFeedback({ success: data.message || "Chave do TMDB salva com sucesso no banco de dados!", error: "" });
      } else {
        setSettingsFeedback({ success: "", error: data.error || "Erro ao salvar configurações." });
      }
    } catch (err: any) {
      setSettingsFeedback({ success: "", error: "Erro de conexão: " + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  // Load TMDB API key and Maintenance config from database on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings/tmdb", {
          headers: {
            "x-user-email": currentUser?.email || ""
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.apiKey) {
            setTmdbApiKey(data.apiKey);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar chave TMDB do banco:", err);
      }

      try {
        const resMaint = await fetch("/api/settings/maintenance");
        if (resMaint.ok) {
          const dataMaint = await resMaint.json();
          if (dataMaint.maintenance) {
            setMaintEnabled(Boolean(dataMaint.maintenance.enabled));
            if (dataMaint.maintenance.title) setMaintTitle(dataMaint.maintenance.title);
            if (dataMaint.maintenance.message) setMaintMessage(dataMaint.maintenance.message);
            if (dataMaint.maintenance.estimatedReturn) setMaintReturn(dataMaint.maintenance.estimatedReturn);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar Modo de Manutenção:", err);
      }
    };
    fetchSettings();
  }, []);

  // Save TMDB API key to local storage when changed
  useEffect(() => {
    if (tmdbApiKey) {
      localStorage.setItem("tmdb_api_key", tmdbApiKey);
    } else {
      localStorage.removeItem("tmdb_api_key");
    }
  }, [tmdbApiKey]);

  const handleTmdbSearch = async (e?: React.FormEvent, pageNumber = 1) => {
    if (e) e.preventDefault();

    setTmdbLoading(true);
    setTmdbError("");
    setTmdbSearchResults([]);

    try {
      const headers: Record<string, string> = {
        "x-user-email": currentUser?.email || ""
      };
      if (tmdbApiKey) {
        headers["x-tmdb-api-key"] = tmdbApiKey;
      }

      const queryParam = encodeURIComponent(tmdbSearchQuery.trim());
      const yearParam = encodeURIComponent(tmdbSearchYear.trim());
      const url = `/api/tmdb/search?query=${queryParam}&type=${tmdbSearchType}&year=${yearParam}&page=${pageNumber}`;

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao buscar dados do TMDB. Verifique sua chave de API.");
      }

      const data = await response.json();
      setTmdbSearchResults(data.results || []);
      setTmdbPage(data.page || 1);
      setTmdbTotalPages(data.totalPages || 1);
      setTmdbTotalResults(data.totalResults || 0);
    } catch (err: any) {
      console.error(err);
      setTmdbError(err.message || "Falha na conexão.");
    } finally {
      setTmdbLoading(false);
    }
  };

  // Auto load popular/recent titles when opening TMDB search modal
  useEffect(() => {
    if (isTmdbSearchOpen && tmdbSearchResults.length === 0 && !tmdbLoading) {
      handleTmdbSearch(undefined, 1);
    }
  }, [isTmdbSearchOpen]);

  // 1-Click Direct Import
  const handleDirectImportTmdb = async (item: any) => {
    const tmdbId = item.tmdbId || item.id;
    setDirectImportingId(tmdbId);
    setTmdbError("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-email": currentUser?.email || ""
      };
      if (tmdbApiKey) {
        headers["x-tmdb-api-key"] = tmdbApiKey;
      }

      const response = await fetch("/api/tmdb/import-direct", {
        method: "POST",
        headers,
        body: JSON.stringify({ tmdbId, type: item.type })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Falha ao importar o título diretamente.");
      }

      const data = await response.json();
      if (data.success && data.movie) {
        setAddedTmdbIds(prev => [...prev, String(tmdbId)]);
        onMoviesUpdated();
      }
    } catch (err: any) {
      console.error(err);
      setTmdbError(err.message || "Erro ao importar do TMDB.");
    } finally {
      setDirectImportingId(null);
    }
  };

  const handleStopBatch = () => {
    batchCancelledRef.current = true;
  };

  const handleRunBatchAutoImport = async () => {
    if (batchRunning) return;
    batchCancelledRef.current = false;
    setBatchRunning(true);
    setBatchResultSummary(null);
    setTmdbError("");

    const targetTotal = Math.max(1, Math.min(batchTargetCount, 100));
    setBatchProgress({
      current: 0,
      total: targetTotal,
      currentTitle: "Conectando ao catálogo do TMDB...",
      addedCount: 0,
      errorCount: 0
    });

    const headers: Record<string, string> = {
      "x-user-email": currentUser?.email || "",
      "Content-Type": "application/json"
    };
    if (tmdbApiKey) {
      headers["x-tmdb-api-key"] = tmdbApiKey;
    }

    let addedCount = 0;
    let errorCount = 0;
    let currentPage = 1;
    const addedTitles: string[] = [];

    try {
      while (addedCount < targetTotal && currentPage <= 50 && !batchCancelledRef.current) {
        const queryParam = encodeURIComponent(tmdbSearchQuery.trim());
        const yearParam = encodeURIComponent(batchYear.trim());
        const searchUrl = `/api/tmdb/search?query=${queryParam}&type=${batchType}&year=${yearParam}&page=${currentPage}`;

        const res = await fetch(searchUrl, { headers });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao consultar o TMDB.");
        }

        const data = await res.json();
        const results: any[] = data.results || [];

        if (results.length === 0) {
          break;
        }

        for (const item of results) {
          if (addedCount >= targetTotal || batchCancelledRef.current) break;

          const itemId = String(item.tmdbId || item.id);
          if (isAlreadyInCatalog(item)) {
            continue;
          }

          setBatchProgress({
            current: addedCount + 1,
            total: targetTotal,
            currentTitle: item.title || item.name || "Processando título...",
            addedCount,
            errorCount
          });

          try {
            const importRes = await fetch("/api/tmdb/import-direct", {
              method: "POST",
              headers,
              body: JSON.stringify({ tmdbId: itemId, type: item.type })
            });

            if (importRes.ok) {
              const importData = await importRes.json();
              if (importData.success && importData.movie) {
                addedCount++;
                const importedTitle = importData.movie.title || item.title;
                addedTitles.push(importedTitle);
                setAddedTmdbIds(prev => [...prev, itemId]);
              } else {
                errorCount++;
              }
            } else {
              errorCount++;
            }
          } catch (impErr) {
            console.error("Erro ao importar no lote:", impErr);
            errorCount++;
          }

          await new Promise(r => setTimeout(r, 180));
        }

        currentPage++;
      }

      onMoviesUpdated();
      setBatchResultSummary({
        added: addedCount,
        titles: addedTitles
      });
    } catch (err: any) {
      console.error("Erro no lote do TMDB:", err);
      setTmdbError(err.message || "Falha na importação automática.");
    } finally {
      setBatchRunning(false);
      setBatchProgress(null);
    }
  };

  const handleImportTmdb = async (tmdbId: string, itemType: "filme" | "serie") => {
    setImportingId(tmdbId);
    setTmdbError("");
    try {
      const headers: Record<string, string> = {
        "x-user-email": currentUser?.email || ""
      };
      if (tmdbApiKey) {
        headers["x-tmdb-api-key"] = tmdbApiKey;
      }
      
      const response = await fetch(`/api/tmdb/details?id=${tmdbId}&type=${itemType}`, {
        headers
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Falha ao obter detalhes do título");
      }
      
      const { result } = await response.json();
      
      // Map to form states
      setTitle(result.title);
      setOriginalTitle(result.originalTitle);
      setType(result.type);
      setYear(result.year);
      setDuration(result.duration);
      setRating(result.rating);
      setGenres(result.genres.join(", "));
      setSynopsis(result.synopsis);
      setBackdropUrl(result.backdropUrl);
      setPosterUrl(result.posterUrl);
      setTrailerVideoId(result.trailerVideoId);
      setCast(result.cast.join(", "));
      setDirector(result.director);
      setFeatured(false);
      setImdbId(result.imdbId);
      
      setEditingMovie(null); // Adding, not editing
      setFormError("");
      setFormSuccess("Dados importados do TMDB com sucesso! Revise os campos e clique em Salvar.");
      
      setIsTmdbSearchOpen(false); // Close search modal
      setIsFormOpen(true); // Open edit/add modal prefilled!
    } catch (err: any) {
      console.error(err);
      setTmdbError(err.message || "Erro desconhecido");
    } finally {
      setImportingId(null);
    }
  };

  // Load users list
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch("/api/users", {
        headers: {
          "x-user-email": currentUser?.email || ""
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Load sent notifications history
  const loadSentNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        headers: {
          "x-user-email": currentUser?.email || ""
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSentNotifications(data.notifications || []);
      }
    } catch (e) {
      console.warn("Erro ao carregar histórico de notificações:", e);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast("Preencha o título e a mensagem da notificação.", "error");
      return;
    }

    if (notifTarget === "specific" && !notifTargetEmail.trim()) {
      showToast("Informe o e-mail do destinatário.", "error");
      return;
    }

    setNotifSubmitting(true);
    try {
      const selectedMovie = movies.find(m => m.id === notifAttachedMovieId);

      const response = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          target: notifTarget,
          targetEmail: notifTargetEmail.trim(),
          type: notifType,
          movieId: notifAttachedMovieId || "",
          movieTitle: selectedMovie ? selectedMovie.title : ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar notificação.");
      }

      showToast(`Notificação enviada com sucesso! (${data.recipientCount || "1"} destinatário(s)) 🎉`, "success");
      setNotifTitle("");
      setNotifMessage("");
      setNotifAttachedMovieId("");
      loadSentNotifications();
    } catch (err: any) {
      showToast(err.message || "Falha ao enviar notificação.", "error");
    } finally {
      setNotifSubmitting(false);
    }
  };

  const handleDeleteNotification = (id: string, title: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Excluir Notificação do Histórico",
      message: `Deseja apagar a notificação "${title}" do histórico de envios?`,
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      isDanger: true,
      onConfirm: async () => {
        setConfirmationModal(null);
        try {
          const response = await fetch(`/api/admin/notifications/${id}`, {
            method: "DELETE",
            headers: {
              "x-user-email": currentUser?.email || ""
            }
          });

          if (response.ok) {
            setSentNotifications(prev => prev.filter(n => n.id !== id));
            showToast("Notificação excluída com sucesso!", "success");
          } else {
            showToast("Erro ao excluir notificação.", "error");
          }
        } catch (e) {
          showToast("Erro de conexão ao excluir.", "error");
        }
      }
    });
  };

  useEffect(() => {
    if (activeSubTab === "users") {
      loadUsers();
    } else if (activeSubTab === "reports") {
      loadReports();
    } else if (activeSubTab === "notifications") {
      loadSentNotifications();
    }
  }, [activeSubTab]);

  // Load Reports
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const response = await fetch("/api/reports", {
        headers: {
          "x-user-email": currentUser?.email || ""
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
        showToast(`Status da denúncia alterado para "${newStatus}"!`, "success");
      } else {
        showToast("Falha ao atualizar status da denúncia.", "error");
      }
    } catch (err) {
      showToast("Erro ao conectar com o servidor.", "error");
    }
  };

  const handleDeleteReport = (reportId: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Excluir Denúncia",
      message: "Deseja excluir esta denúncia permanentemente?",
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      isDanger: true,
      onConfirm: async () => {
        setConfirmationModal(null);
        try {
          const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
            method: "DELETE",
            headers: {
              "x-user-email": currentUser?.email || ""
            }
          });

          if (response.ok) {
            setReports(prev => prev.filter(r => r.id !== reportId));
            showToast("Denúncia excluída com sucesso!", "success");
          } else {
            showToast("Falha ao excluir denúncia.", "error");
          }
        } catch (err) {
          showToast("Erro ao conectar com o servidor.", "error");
        }
      }
    });
  };

  const handleSendReportReply = async (reportId: string) => {
    if (!replyText.trim()) {
      showToast("Por favor, digite uma mensagem de resposta para o usuário.", "info");
      return;
    }
    setReplySubmitting(true);
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({
          status: replyStatus,
          adminReply: replyText.trim()
        })
      });

      if (response.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { 
          ...r, 
          status: replyStatus, 
          adminReply: replyText.trim(),
          replyUpdatedAt: new Date().toISOString()
        } : r));
        showToast("Resposta enviada e usuário notificado com sucesso!", "success");
        setReplyingReportId(null);
        setReplyText("");
      } else {
        showToast("Falha ao enviar resposta para o relatório.", "error");
      }
    } catch (err) {
      showToast("Erro ao conectar com o servidor.", "error");
    } finally {
      setReplySubmitting(false);
    }
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingMovie(null);
    setTitle("");
    setOriginalTitle("");
    setType("filme");
    setYear(new Date().getFullYear());
    setDuration("120 min");
    setRating(8.0);
    setGenres("Ação, Drama");
    setSynopsis("");
    setBackdropUrl("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000");
    setPosterUrl("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500");
    setTrailerVideoId("dQw4w9WgXcQ");
    setCast("Ator 1, Atriz 2");
    setDirector("Diretor Famoso");
    setFeatured(false);
    setImdbId("");
    
    setFormError("");
    setFormSuccess("");
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setTitle(movie.title);
    setOriginalTitle(movie.originalTitle || movie.title);
    setType(movie.type);
    setYear(movie.year);
    setDuration(movie.duration);
    setRating(movie.rating);
    setGenres(movie.genres.join(", "));
    setSynopsis(movie.synopsis);
    setBackdropUrl(movie.backdropUrl);
    setPosterUrl(movie.posterUrl);
    setTrailerVideoId(movie.trailerVideoId);
    setCast(movie.cast.join(", "));
    setDirector(movie.director);
    setFeatured(movie.featured || false);
    setImdbId(movie.imdbId || "");

    setFormError("");
    setFormSuccess("");
    setIsFormOpen(true);
  };

  // Submit Form (Create / Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormSubmitting(true);

    const genresArray = genres.split(",").map(g => g.trim()).filter(Boolean);
    const castArray = cast.split(",").map(c => c.trim()).filter(Boolean);

    const payload = {
      title,
      originalTitle,
      type,
      year: Number(year),
      duration,
      rating: Number(rating),
      genres: genresArray,
      synopsis,
      backdropUrl,
      posterUrl,
      trailerVideoId,
      cast: castArray,
      director,
      featured,
      imdbId,
    };

    const url = editingMovie ? `/api/movies/${editingMovie.id}` : "/api/movies";
    const method = editingMovie ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ocorreu um erro ao salvar o título.");
      }

      setFormSuccess(editingMovie ? "Título atualizado com sucesso!" : "Título adicionado com sucesso!");
      onMoviesUpdated(); // Sync catalog in parent
      
      setTimeout(() => {
        setIsFormOpen(false);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "Erro de conexão.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Featured/Lançamento
  const handleToggleFeatured = async (movie: Movie) => {
    try {
      const updatedMovie = {
        ...movie,
        featured: !movie.featured
      };
      const response = await fetch(`/api/movies/${encodeURIComponent(movie.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify(updatedMovie)
      });

      if (response.ok) {
        onMoviesUpdated();
        showToast(
          updatedMovie.featured 
            ? `"${movie.title}" marcado como Lançamento!` 
            : `"${movie.title}" removido dos Lançamentos.`,
          "success"
        );
      } else {
        showToast("Erro ao alterar status de lançamento.", "error");
      }
    } catch (e) {
      showToast("Erro ao conectar com o servidor.", "error");
    }
  };

  // Delete Movie
  const handleDeleteMovie = (movieId: string, title: string) => {
    setConfirmationModal({
      isOpen: true,
      title: "Excluir Título do Catálogo",
      message: `Tem certeza que deseja excluir "${title}" permanentemente do catálogo?`,
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      isDanger: true,
      onConfirm: async () => {
        setConfirmationModal(null);
        try {
          const response = await fetch(`/api/movies/${encodeURIComponent(movieId)}`, {
            method: "DELETE",
            headers: {
              "x-user-email": currentUser?.email || ""
            }
          });

          if (response.ok) {
            onMoviesUpdated();
            showToast(`Título "${title}" excluído com sucesso!`, "success");
          } else {
            const err = await response.json().catch(() => ({}));
            showToast(`Erro ao excluir: ${err.error || "Erro desconhecido"}`, "error");
          }
        } catch (e) {
          showToast("Erro ao conectar com o servidor.", "error");
        }
      }
    });
  };

  // User Management Modals & Handlers
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserNameInput("");
    setUserEmailInput("");
    setUserPasswordInput("");
    setUserRoleInput("user");
    setUserModalError("");
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setUserNameInput(u.name || "");
    setUserEmailInput(u.email || "");
    setUserPasswordInput("");
    setUserRoleInput(u.role === "admin" ? "admin" : "user");
    setUserModalError("");
    setIsUserModalOpen(true);
  };

  const handleSaveUserModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNameInput.trim() || !userEmailInput.trim()) {
      setUserModalError("Nome e e-mail são obrigatórios.");
      return;
    }

    if (!editingUser && !userPasswordInput.trim()) {
      setUserModalError("Senha é obrigatória para novo usuário.");
      return;
    }

    setUserModalSubmitting(true);
    setUserModalError("");

    try {
      const isEdit = Boolean(editingUser);
      const url = isEdit 
        ? `/api/users/${encodeURIComponent(editingUser.id)}` 
        : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = {
        name: userNameInput.trim(),
        email: userEmailInput.trim(),
        role: userRoleInput
      };
      if (userPasswordInput.trim()) {
        payload.password = userPasswordInput.trim();
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar usuário.");
      }

      showToast(
        isEdit 
          ? `Usuário "${userNameInput}" atualizado com sucesso!` 
          : `Usuário "${userNameInput}" criado com sucesso!`, 
        "success"
      );

      setIsUserModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setUserModalError(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setUserModalSubmitting(false);
    }
  };

  // Update User Role
  const handleToggleUserRole = (userId: string, currentRole: string, userName: string) => {
    if (userId === "admin-default") {
      showToast("O administrador principal padrão não pode ter seu nível de acesso alterado.", "info");
      return;
    }

    const newRole = currentRole === "admin" ? "user" : "admin";
    const roleLabel = newRole === "admin" ? "ADMINISTRADOR" : "USUÁRIO COMUM";

    setConfirmationModal({
      isOpen: true,
      title: newRole === "admin" ? "Promover a Administrador" : "Remover Acesso de Admin",
      message: `Deseja alterar o nível de acesso de "${userName}" para ${roleLabel}?`,
      confirmText: "Confirmar Alteração",
      cancelText: "Cancelar",
      isDanger: newRole !== "admin",
      onConfirm: async () => {
        setConfirmationModal(null);

        // Optimistically update local users state
        setUsers(prev => prev.map(u => (u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase())) ? { ...u, role: newRole } : u));

        try {
          const response = await fetch(`/api/users/${encodeURIComponent(userId)}/role`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "x-user-email": currentUser?.email || ""
            },
            body: JSON.stringify({ role: newRole })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            showToast(`Nível de acesso de "${userName}" alterado para ${roleLabel}!`, "success");
            loadUsers();
          } else {
            showToast(`Erro ao alterar nível de acesso: ${data.error || "Ação não permitida"}`, "error");
            loadUsers();
          }
        } catch (e) {
          showToast("Erro ao conectar ao servidor.", "error");
          loadUsers();
        }
      }
    });
  };

  // Toggle User Ban/Block status
  const handleToggleUserStatus = (userId: string, currentStatus: string, userName: string) => {
    if (userId === "admin-default") {
      showToast("O administrador principal padrão não pode ser bloqueado.", "info");
      return;
    }

    if (userId === currentUser?.id) {
      showToast("Você não pode bloquear sua própria conta enquanto estiver logado.", "info");
      return;
    }

    const newStatus = currentStatus === "banned" ? "active" : "banned";
    const statusLabel = newStatus === "banned" ? "Sim, Bloquear Acesso" : "Sim, Desbloquear Acesso";

    setConfirmationModal({
      isOpen: true,
      title: newStatus === "banned" ? "Bloquear Acesso do Usuário" : "Desbloquear Usuário",
      message: `Tem certeza que deseja ${newStatus === "banned" ? "bloquear o acesso de" : "desbloquear o acesso de"} "${userName}"? ${newStatus === "banned" ? "O usuário será desconectado e não conseguirá mais entrar na plataforma PipocaMax." : "O usuário poderá voltar a fazer login e acessar o sistema normalmente."}`,
      confirmText: statusLabel,
      cancelText: "Cancelar",
      isDanger: newStatus === "banned",
      onConfirm: async () => {
        setConfirmationModal(null);

        // Optimistically update local users state
        setUsers(prev => prev.map(u => (u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase())) ? { ...u, status: newStatus } : u));

        try {
          const response = await fetch(`/api/users/${encodeURIComponent(userId)}/status`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "x-user-email": currentUser?.email || ""
            },
            body: JSON.stringify({ status: newStatus })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            showToast(data.message || (newStatus === "banned" ? "Usuário bloqueado com sucesso!" : "Usuário desbloqueado com sucesso!"), "success");
            loadUsers();
          } else {
            showToast(`Erro ao alterar status: ${data.error || "Ação não permitida"}`, "error");
            loadUsers();
          }
        } catch (e) {
          showToast("Erro ao conectar ao servidor.", "error");
          loadUsers();
        }
      }
    });
  };

  // Delete User
  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === "admin-default") {
      showToast("O administrador principal padrão não pode ser excluído.", "info");
      return;
    }

    if (userId === currentUser?.id) {
      showToast("Você não pode excluir sua própria conta enquanto estiver logado.", "info");
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: "Excluir Usuário",
      message: `Deseja remover o usuário "${userName}" permanentemente do site?`,
      confirmText: "Sim, Excluir Usuário",
      cancelText: "Cancelar",
      isDanger: true,
      onConfirm: async () => {
        setConfirmationModal(null);

        // Optimistically remove user from local users state
        setUsers(prev => prev.filter(u => u.id !== userId));

        try {
          const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
            method: "DELETE",
            headers: {
              "x-user-email": currentUser?.email || ""
            }
          });

          if (response.ok) {
            showToast(`Usuário "${userName}" removido com sucesso!`, "success");
            loadUsers();
          } else {
            const err = await response.json().catch(() => ({}));
            showToast(`Erro ao excluir usuário: ${err.error || "Ação não permitida"}`, "error");
            loadUsers();
          }
        } catch (e) {
          showToast("Erro ao conectar com o servidor.", "error");
          loadUsers();
        }
      }
    });
  };

  // Type Counts
  const totalMovies = movies.filter(m => m.type === "filme").length;
  const totalSeries = movies.filter(m => m.type === "serie").length;
  const totalAnimes = movies.filter(m => m.type === "anime").length;
  const featuredTitles = movies.filter(m => m.featured).length;

  return (
    <div className="bg-black text-white min-h-screen p-4 md:p-8" id="admin-panel-container">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-[9999] max-w-md px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 ${
              toast.type === "error"
                ? "bg-red-950/90 border-red-800 text-red-200"
                : toast.type === "info"
                ? "bg-blue-950/90 border-blue-800 text-blue-200"
                : "bg-emerald-950/90 border-emerald-800 text-emerald-200"
            }`}
          >
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {toast.type === "info" && <Shield className="w-5 h-5 text-blue-400 shrink-0" />}
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <span className="text-xs font-bold leading-tight">{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmationModal?.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0f0f0f] border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${confirmationModal.isDanger ? "bg-red-950/60 border border-red-800 text-red-400" : "bg-blue-950/60 border border-blue-800 text-blue-400"}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-snug">{confirmationModal.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Confirmação do Administrador</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmationModal(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-xl bg-gray-900 border border-gray-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-black/60 border border-gray-900 p-4 rounded-2xl text-xs text-gray-200 leading-relaxed">
                {confirmationModal.message}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmationModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900 text-xs font-bold transition-all cursor-pointer"
                >
                  {confirmationModal.cancelText || "Cancelar"}
                </button>
                <button
                  onClick={confirmationModal.onConfirm}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-lg ${
                    confirmationModal.isDanger
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30"
                  }`}
                >
                  {confirmationModal.confirmText || "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Header Panel */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-900 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-primary text-xs font-black uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 animate-pulse" />
            <span>Painel Administrativo PipocaMax</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white">
            Painel de Controle
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            Olá, <strong className="text-gray-200">{currentUser?.name || "Administrador"}</strong>. Gerencie o catálogo, animes, séries, filmes e usuários.
          </p>
        </div>

        {/* Mini Tab Links */}
        <div className="flex items-center gap-1.5 bg-[#0e0e0e] border border-gray-900 p-1.5 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab("catalog")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === "catalog"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Gerenciar Catálogo</span>
          </button>

          <button
            onClick={() => setIsTmdbSearchOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-400 border border-emerald-800/60 shadow-md shadow-emerald-900/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Importar do TMDB</span>
          </button>

          <button
            onClick={() => setActiveSubTab("users")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === "users"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários</span>
          </button>

          <button
            onClick={() => setActiveSubTab("notifications")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === "notifications"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Notificações</span>
          </button>

          <button
            onClick={() => setActiveSubTab("reports")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap relative ${
              activeSubTab === "reports"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/20"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Denúncias & Relatórios</span>
            {reports.filter(r => r.status === "Pendente").length > 0 && (
              <span className="bg-amber-500 text-black font-black text-[9px] px-1.5 py-0.2 rounded-full">
                {reports.filter(r => r.status === "Pendente").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("stats")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === "stats"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Métricas do Site</span>
          </button>

          <button
            onClick={() => setActiveSubTab("settings")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === "settings"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurações</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        
        {/* VIEW 1: CATALOG MANAGEMENT */}
        {activeSubTab === "catalog" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-200 mr-auto">
                <FileSpreadsheet className="w-4 h-4 text-brand-primary" />
                <span>Lista Geral de Títulos ({movies.length})</span>
              </h2>

              <button
                onClick={() => setIsTmdbSearchOpen(true)}
                className="bg-[#00d573] hover:bg-[#00bc65] text-black text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-green-500/10 hover:scale-102 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Importar TMDB</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/10 hover:scale-102 transition-all"
                id="btn-add-movie"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Manual</span>
              </button>
            </div>

            {/* Search & Filters Row */}
            <div className="bg-[#0c0c0c] border border-gray-900/60 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-3 items-center">
              {/* Text Search */}
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por título ou título original..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-xs pl-10 pr-4 py-2.5 rounded-xl transition-all"
                />
                {catalogSearch && (
                  <button 
                    onClick={() => setCatalogSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs font-bold"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <div className="relative w-full md:w-48">
                <select
                  value={catalogTypeFilter}
                  onChange={(e: any) => setCatalogTypeFilter(e.target.value)}
                  className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-xs px-3 py-2.5 rounded-xl appearance-none cursor-pointer"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="filme">Filme</option>
                  <option value="serie">Série</option>
                  <option value="anime">Anime</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Genre Filter */}
              <div className="relative w-full md:w-56">
                <select
                  value={catalogGenreFilter}
                  onChange={(e) => setCatalogGenreFilter(e.target.value)}
                  className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-xs px-3 py-2.5 rounded-xl appearance-none cursor-pointer capitalize"
                >
                  <option value="todos">Todos os Gêneros</option>
                  {availableGenres.filter(g => g !== "todos").map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Reset Button */}
              {(catalogSearch || catalogTypeFilter !== "todos" || catalogGenreFilter !== "todos") && (
                <button
                  onClick={() => {
                    setCatalogSearch("");
                    setCatalogTypeFilter("todos");
                    setCatalogGenreFilter("todos");
                  }}
                  className="w-full md:w-auto bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>

            {/* Titles List Table */}
            <div className="bg-[#0c0c0c] border border-gray-950 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#121212] text-gray-400 border-b border-gray-900/60 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Poster</th>
                      <th className="py-3.5 px-4">Título / Ano</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Gêneros</th>
                      <th className="py-3.5 px-4">IMDB / Avaliação</th>
                      <th className="py-3.5 px-4">Destaque</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/40">
                    {paginatedCatalogMovies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500 text-xs">
                          Nenhum título corresponde aos filtros de pesquisa selecionados.
                        </td>
                      </tr>
                    ) : (
                      paginatedCatalogMovies.map((movie) => (
                        <tr key={movie.id} className="hover:bg-gray-900/10 transition-colors">
                        {/* Poster */}
                        <td className="py-3 px-4">
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded-lg border border-gray-900 shadow-md"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                          />
                        </td>
                        
                        {/* Title and year */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-100 text-sm">{movie.title}</div>
                          <div className="text-gray-500 mt-0.5">{movie.originalTitle || movie.title} • {movie.year} • {movie.duration}</div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            movie.type === "filme" 
                              ? "bg-blue-950/40 border border-blue-900/30 text-blue-400"
                              : movie.type === "serie"
                                ? "bg-red-950/40 border border-red-900/30 text-red-400"
                                : "bg-amber-950/40 border border-amber-900/30 text-amber-400"
                          }`}>
                            {movie.type}
                          </span>
                        </td>

                        {/* Genres */}
                        <td className="py-3 px-4 max-w-[200px] truncate">
                          <div className="flex flex-wrap gap-1">
                            {movie.genres.map((g, idx) => (
                              <span key={idx} className="bg-gray-950 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">
                                {g}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 font-bold font-mono">★</span>
                            <span className="font-mono font-bold text-gray-200">{movie.rating.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Featured */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleFeatured(movie)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              movie.featured
                                ? "bg-red-950/40 border-red-900/40 text-red-400 hover:bg-red-900/60 hover:text-white"
                                : "bg-gray-950 border-gray-900 text-gray-500 hover:text-gray-300 hover:border-gray-800"
                            }`}
                            title={movie.featured ? "Remover de Lançamentos" : "Marcar como Lançamento"}
                          >
                            <Sparkle className={`w-3 h-3 ${movie.featured ? "text-red-400 fill-red-400 animate-pulse" : "text-gray-600"}`} />
                            <span>{movie.featured ? "Lançamento" : "+ Lançamento"}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(movie)}
                              className="p-1.5 rounded-lg bg-gray-950 border border-gray-900 hover:border-red-600/30 hover:bg-gray-900 text-gray-300 hover:text-white transition-all cursor-pointer"
                              title="Editar Título"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMovie(movie.id, movie.title)}
                              className="p-1.5 rounded-lg bg-red-950/10 border border-red-950/20 hover:border-red-600/50 hover:bg-red-950/30 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                              title="Excluir Título"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls for Catalog */}
              {totalCatalogPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-[#101010] border-t border-gray-900 text-xs">
                  <span className="text-gray-400">
                    Página <strong className="text-white">{catalogPage}</strong> de <strong className="text-white">{totalCatalogPages}</strong> ({filteredCatalogMovies.length} títulos)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCatalogPage((prev) => Math.max(1, prev - 1))}
                      disabled={catalogPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-black border border-gray-800 text-gray-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogPage((prev) => Math.min(totalCatalogPages, prev + 1))}
                      disabled={catalogPage === totalCatalogPages}
                      className="px-3 py-1.5 rounded-lg bg-black border border-gray-800 text-gray-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* VIEW 2: USER MANAGEMENT */}
        {activeSubTab === "users" && (
          <div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-200">
                  <Users className="w-5 h-5 text-brand-primary" />
                  <span>Gerenciar Usuários ({filteredUsers.length})</span>
                </h2>

                {/* Filter Pills */}
                <div className="hidden sm:flex items-center gap-1 bg-[#0c0c0c] border border-gray-900 p-1 rounded-xl">
                  <button
                    onClick={() => setUserRoleFilter("todos")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      userRoleFilter === "todos"
                        ? "bg-red-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("admin")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      userRoleFilter === "admin"
                        ? "bg-red-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Admins
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("user")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      userRoleFilter === "user"
                        ? "bg-red-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Comuns
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("banned")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      userRoleFilter === "banned"
                        ? "bg-red-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    <span>Bloqueados ({users.filter(u => u.status === "banned").length})</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                {/* User search bar */}
                <div className="relative flex-grow md:w-64">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-xs pl-9 pr-3 py-2 rounded-xl transition-all"
                  />
                </div>

                {/* Add User Button */}
                <button
                  onClick={handleOpenAddUser}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Usuário</span>
                </button>
              </div>
            </div>

            {/* Mobile Filter Pills */}
            <div className="flex sm:hidden items-center gap-1 bg-[#0c0c0c] border border-gray-900 p-1 rounded-xl mb-4">
              <button
                onClick={() => setUserRoleFilter("todos")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                  userRoleFilter === "todos"
                    ? "bg-red-600 text-white"
                    : "text-gray-400"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setUserRoleFilter("admin")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                  userRoleFilter === "admin"
                    ? "bg-red-600 text-white"
                    : "text-gray-400"
                }`}
              >
                Admins
              </button>
              <button
                onClick={() => setUserRoleFilter("user")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer ${
                  userRoleFilter === "user"
                    ? "bg-red-600 text-white"
                    : "text-gray-400"
                }`}
              >
                Comuns
              </button>
              <button
                onClick={() => setUserRoleFilter("banned")}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  userRoleFilter === "banned"
                    ? "bg-red-600 text-white"
                    : "text-gray-400"
                }`}
              >
                <Ban className="w-3 h-3" />
                <span>Bloq.</span>
              </button>
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-8 text-center text-gray-500 text-xs">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-[#0c0c0c] border border-gray-950 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="bg-[#121212] text-gray-400 border-b border-gray-900/60 uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="py-3.5 px-4">Nome</th>
                          <th className="py-3.5 px-4">E-mail</th>
                          <th className="py-3.5 px-4">Nível de Acesso</th>
                          <th className="py-3.5 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900/40">
                        {paginatedUsers.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-900/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-gray-100">{u.name}</td>
                            <td className="py-3 px-4 text-gray-400 font-mono">{u.email}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  u.role === "admin"
                                    ? "bg-red-950/40 border border-red-900/30 text-red-400"
                                    : "bg-gray-950 border border-gray-900 text-gray-400"
                                }`}>
                                  <Shield className="w-2.5 h-2.5" />
                                  {u.role === "admin" ? "Administrador" : "Usuário Comum"}
                                </span>
                                {u.status === "banned" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600/20 border border-red-500/50 text-red-400">
                                    <Ban className="w-2.5 h-2.5" />
                                    Bloqueado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-900 hover:border-gray-700 text-gray-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="Editar Usuário"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => handleToggleUserRole(u.id, u.role, u.name)}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                    u.role === "admin"
                                      ? "bg-gray-950 border-gray-900 text-gray-400 hover:text-white"
                                      : "bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white"
                                  }`}
                                >
                                  {u.role === "admin" ? "Tornar Comum" : "Tornar Admin"}
                                </button>
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, u.status, u.name)}
                                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                    u.status === "banned"
                                      ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900 hover:text-white"
                                      : "bg-red-950/40 border-red-900/40 text-red-400 hover:bg-red-900 hover:text-white"
                                  }`}
                                  title={u.status === "banned" ? "Desbloquear Usuário" : "Bloquear Usuário"}
                                >
                                  {u.status === "banned" ? (
                                    <>
                                      <Unlock className="w-3 h-3" />
                                      <span>Desbloquear</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-3 h-3" />
                                      <span>Bloquear</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-900/40 hover:border-red-600 hover:bg-red-900/40 text-red-400 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {paginatedUsers.map((u: any) => (
                    <div 
                      key={u.id}
                      className="bg-[#0c0c0c] border border-gray-900 p-4 rounded-2xl shadow-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-white text-sm">{u.name}</h4>
                          <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            u.role === "admin"
                              ? "bg-red-950/40 border border-red-900/30 text-red-400"
                              : "bg-gray-950 border border-gray-900 text-gray-400"
                          }`}>
                            <Shield className="w-2.5 h-2.5" />
                            {u.role === "admin" ? "Admin" : "Comum"}
                          </span>
                          {u.status === "banned" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600/20 border border-red-500/50 text-red-400 shrink-0">
                              <Ban className="w-2.5 h-2.5" />
                              Bloqueado
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-900/60 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-3 py-2 bg-gray-950 border border-gray-900 text-gray-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.role, u.name)}
                          className={`flex-1 text-[11px] font-bold py-2 px-3 rounded-xl border transition-all text-center cursor-pointer ${
                            u.role === "admin"
                              ? "bg-gray-950 border-gray-900 text-gray-400 hover:text-white"
                              : "bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white"
                          }`}
                        >
                          {u.role === "admin" ? "Tornar Comum" : "Tornar Admin"}
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status, u.name)}
                          className={`px-3 py-2 border text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            u.status === "banned"
                              ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900 hover:text-white"
                              : "bg-red-950/40 border-red-900/40 text-red-400 hover:bg-red-900 hover:text-white"
                          }`}
                          title={u.status === "banned" ? "Desbloquear" : "Bloquear"}
                        >
                          {u.status === "banned" ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Desbloquear</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              <span>Bloquear</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="px-3 py-2 bg-red-950/20 border border-red-900/40 hover:bg-red-900/40 text-red-400 hover:text-white text-[11px] font-bold rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination controls for Users */}
                {totalUsersPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 bg-[#0c0c0c] border border-gray-900 rounded-2xl text-xs">
                    <span className="text-gray-400">
                      Página <strong className="text-white">{usersPage}</strong> de <strong className="text-white">{totalUsersPages}</strong> ({filteredUsers.length} usuários)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                        disabled={usersPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-black border border-gray-800 text-gray-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsersPage((prev) => Math.min(totalUsersPages, prev + 1))}
                        disabled={usersPage === totalUsersPages}
                        className="px-3 py-1.5 rounded-lg bg-black border border-gray-800 text-gray-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW: BROADCAST NOTIFICATIONS & MESSAGES */}
        {activeSubTab === "notifications" && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span>Central de Notificações & Transmissão Premium</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Envie mensagens direcionadas ou avisos em massa para todos os usuários do PipocaMax com pré-visualização ao vivo.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-black/60 border border-gray-800 px-3.5 py-2 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Notificações Enviadas</span>
                  <span className="text-sm font-black text-amber-400 font-mono">{sentNotifications.length}</span>
                </div>
                <div className="bg-black/60 border border-gray-800 px-3.5 py-2 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Usuários Cadastrados</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{users.length || "—"}</span>
                </div>
              </div>
            </div>

            {/* Quick Templates / Presets */}
            <div className="bg-[#0c0c0c] border border-gray-900/80 p-4 rounded-2xl space-y-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Modelos Rápido para Disparo Instantâneo</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotifTitle("🎬 Novo Lançamento Adicionado!");
                    setNotifMessage("Adicionamos um novo título em alta qualidade no catálogo do PipocaMax! Confira agora e boa sessão! 🍿");
                    setNotifType("success");
                    setNotifTarget("all");
                  }}
                  className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <span>🎬 Novo Lançamento</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNotifTitle("🍿 Especial Fim de Semana no PipocaMax");
                    setNotifMessage("Que tal maratonar os filmes e séries mais populares da semana? Acesse nossa aba de destaques!");
                    setNotifType("info");
                    setNotifTarget("all");
                  }}
                  className="bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <span>🍿 Especial Fim de Semana</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNotifTitle("⚡ Aviso de Manutenção Programada");
                    setNotifMessage("Estamos realizando melhorias em nossos servidores de vídeo para garantir a melhor qualidade de reprodução. O site continuará funcionando normalmente.");
                    setNotifType("warning");
                    setNotifTarget("all");
                  }}
                  className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <span>⚡ Aviso de Manutenção</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNotifTitle("🚀 Novas Funcionalidades Disponíveis!");
                    setNotifMessage("Atualizamos a plataforma com suporte a Modo Cinema em tela cheia e acompanhamento de episódios no 'Continue Assistindo'!");
                    setNotifType("success");
                    setNotifTarget("all");
                  }}
                  className="bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <span>🚀 Atualização do App</span>
                </button>
              </div>
            </div>

            {/* Grid 2-Columns: Form Composer (Left) + Live Card Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Composer */}
              <div className="lg:col-span-7 bg-[#0c0c0c] border border-gray-900 p-6 rounded-3xl shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                  <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-brand-primary" />
                    <span>Criar Mensagem de Notificação</span>
                  </h4>
                  <span className="text-[10px] text-amber-400 font-mono uppercase bg-amber-950/60 border border-amber-900/40 px-2 py-0.5 rounded-md">
                    Compositor
                  </span>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Título do Anúncio / Notificação *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Novo Filme Adicionado no PipocaMax!"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      maxLength={100}
                      required
                      className="w-full bg-black border border-gray-900 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-3.5 rounded-xl transition-all font-medium"
                    />
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Público Alvo (Destinatários)
                    </label>
                    <select
                      value={notifTarget}
                      onChange={(e: any) => setNotifTarget(e.target.value)}
                      className="w-full bg-black border border-gray-900 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-3 rounded-xl transition-all cursor-pointer font-semibold"
                    >
                      <option value="all">📢 Todos os Usuários do Site</option>
                      <option value="users">👤 Apenas Usuários Comuns</option>
                      <option value="admins">🛡️ Apenas Administradores</option>
                      <option value="specific">✉️ Usuário Específico (Por E-mail)</option>
                    </select>
                  </div>

                  {/* Specific Target Email if selected */}
                  {notifTarget === "specific" && (
                    <div className="space-y-1 bg-black/80 border border-amber-900/50 p-3 rounded-2xl animate-fadeIn">
                      <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                        E-mail do Usuário Específico *
                      </label>
                      <input
                        type="email"
                        placeholder="Ex: usuario@email.com"
                        value={notifTargetEmail}
                        onChange={(e) => setNotifTargetEmail(e.target.value)}
                        required
                        className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all font-mono"
                      />
                    </div>
                  )}

                  {/* Notification Message Content */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Mensagem / Conteúdo da Notificação *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Escreva a mensagem clara que aparecerá para o usuário na central de notificações..."
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      required
                      className="w-full bg-black border border-gray-900 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-3.5 rounded-xl transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {/* Category Type & Optional Movie Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Style Type */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Estilo Visual
                      </label>
                      <select
                        value={notifType}
                        onChange={(e: any) => setNotifType(e.target.value)}
                        className="w-full bg-black border border-gray-900 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-3 rounded-xl transition-all cursor-pointer font-medium"
                      >
                        <option value="info">ℹ️ Informativo (Azul)</option>
                        <option value="success">🎉 Novidade / Sucesso (Verde)</option>
                        <option value="warning">⚠️ Alerta / Aviso (Amarelo)</option>
                        <option value="alert">🔥 Urgente / Destaque (Vermelho)</option>
                      </select>
                    </div>

                    {/* Optional Attached Movie */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Vincular Filme/Série (Opcional)
                      </label>
                      <select
                        value={notifAttachedMovieId}
                        onChange={(e) => setNotifAttachedMovieId(e.target.value)}
                        className="w-full bg-black border border-gray-900 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-3 rounded-xl transition-all cursor-pointer font-medium"
                      >
                        <option value="">Nenhum título vinculado</option>
                        {movies.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.type === "serie" ? "📺" : m.type === "anime" ? "🎌" : "🎬"} {m.title} ({m.year})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={notifSubmitting}
                      className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/30 hover:scale-[1.01] flex items-center justify-center gap-2"
                    >
                      {notifSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Disparando Notificação...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Disparar Notificação Agora</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Card Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#0c0c0c] border border-gray-900 p-5 rounded-3xl space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-2.5">
                    <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Pré-Visualização em Tempo Real
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Como o usuário verá</span>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Assim é como a notificação irá aparecer na caixa de entrada do usuário:
                  </p>

                  {/* Live Card Replica */}
                  <div className={`p-4 rounded-2xl border transition-all shadow-xl bg-black/90 ${
                    notifType === "success"
                      ? "border-emerald-800/80 shadow-emerald-950/30"
                      : notifType === "warning"
                      ? "border-amber-800/80 shadow-amber-950/30"
                      : notifType === "alert"
                      ? "border-red-800/80 shadow-red-950/30"
                      : "border-sky-800/80 shadow-sky-950/30"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border shrink-0 ${
                        notifType === "success"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : notifType === "warning"
                          ? "bg-amber-950 text-amber-400 border-amber-800"
                          : notifType === "alert"
                          ? "bg-red-950 text-red-400 border-red-800"
                          : "bg-sky-950 text-sky-400 border-sky-800"
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-extrabold text-xs text-white leading-tight">
                            {notifTitle || "Título da Notificação"}
                          </h5>
                          <span className="text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider text-amber-400 border-amber-800 bg-amber-950">
                            {notifTarget === "all" ? "📢 Geral" : notifTarget === "admins" ? "🛡️ Admin" : "👤 Direto"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {notifMessage || "O conteúdo da sua mensagem aparecerá aqui exatamente formatado..."}
                        </p>

                        {notifAttachedMovieId && (
                          <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1 pt-1">
                            <span>▶ Assistir ao Título Vinculado</span>
                          </div>
                        )}

                        <div className="text-[9px] text-gray-500 pt-1 border-t border-gray-900">
                          Agora mesmo • Enviado pela Equipe PipocaMax
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sent Notifications History */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Histórico de Mensagens Enviadas ({sentNotifications.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={loadSentNotifications}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-black border border-gray-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Atualizar Histórico</span>
                </button>
              </div>

              {notificationsLoading ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
                  Carregando histórico de notificações...
                </div>
              ) : sentNotifications.length > 0 ? (
                <div className="space-y-3">
                  {sentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="bg-black/60 border border-gray-900 hover:border-gray-800 p-4 rounded-2xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-extrabold text-sm text-white">
                            {n.title}
                          </h5>
                          
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${
                            n.target === "all"
                              ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-400"
                              : n.target === "admins"
                              ? "bg-red-950/60 border-red-800/80 text-red-400"
                              : "bg-sky-950/60 border-sky-800/80 text-sky-400"
                          }`}>
                            {n.target === "all" ? "📢 Todos" : n.target === "users" ? "👤 Usuários" : n.target === "admins" ? "🛡️ Admins" : `✉️ ${n.userEmail}`}
                          </span>

                          <span className="text-[9px] font-bold text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                            {n.type === "success" ? "🎉 Sucesso" : n.type === "warning" ? "⚠️ Alerta" : n.type === "alert" ? "🔥 Destaque" : "ℹ️ Info"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {n.message}
                        </p>

                        {n.movieTitle && (
                          <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                            <span>🎬 Título Vinculado:</span>
                            <span className="underline">{n.movieTitle}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-3 pt-1 border-t border-gray-900/60">
                          <span>Enviado por: <strong className="text-gray-300">{n.createdBy || "Admin"}</strong></span>
                          <span>•</span>
                          <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString("pt-BR") : "Recentemente"} às {n.createdAt ? new Date(n.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          {Array.isArray(n.readBy) && n.readBy.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">Lido por {n.readBy.length} usuário(s)</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(n.id, n.title)}
                        className="text-red-400 hover:text-white bg-red-950/30 hover:bg-red-900/60 border border-red-900/40 p-2.5 rounded-xl transition-all cursor-pointer shrink-0 self-end md:self-center"
                        title="Excluir notificação do histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs bg-black/40 border border-gray-900 rounded-2xl">
                  <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  Nenhuma notificação foi enviada ainda. Use o formulário acima para disparar seu primeiro aviso!
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: REPORTS & DENÚNCIAS MANAGEMENT */}
        {activeSubTab === "reports" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c0c0c] border border-gray-900 p-5 rounded-2xl">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-amber-400" />
                  <span>Central de Atendimento & Denúncias</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Gerencie denúncias enviadas pelos usuários, envie respostas diretas e atualize os status de correção.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar por título ou e-mail..."
                    value={reportsSearchQuery}
                    onChange={(e) => setReportsSearchQuery(e.target.value)}
                    className="w-full sm:w-56 bg-black border border-gray-800 text-white text-xs py-2 pl-9 pr-3 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-black border border-gray-800 p-1 rounded-xl">
                  {(["todos", "Pendente", "Em Análise", "Resolvido"] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      onClick={() => setReportsFilter(filterOpt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                        reportsFilter === filterOpt
                          ? "bg-brand-primary text-white shadow"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {filterOpt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {reportsLoading ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
                Carregando relatórios de usuários...
              </div>
            ) : reports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports
                  .filter((r) => reportsFilter === "todos" || r.status === reportsFilter)
                  .filter((r) => {
                    if (!reportsSearchQuery.trim()) return true;
                    const q = reportsSearchQuery.toLowerCase();
                    return (
                      (r.movieTitle || "").toLowerCase().includes(q) ||
                      (r.userEmail || "").toLowerCase().includes(q) ||
                      (r.reason || "").toLowerCase().includes(q) ||
                      (r.description || "").toLowerCase().includes(q)
                    );
                  })
                  .map((report) => {
                    const isReplying = replyingReportId === report.id;

                    return (
                      <div
                        key={report.id}
                        className="bg-[#0c0c0c] border border-gray-900 hover:border-gray-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-black font-mono text-amber-400 block uppercase tracking-wider">
                                {report.reason}
                              </span>
                              <h4 className="font-extrabold text-white text-base mt-0.5">
                                {report.movieTitle || "Problema Geral no Site"}
                              </h4>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0 ${
                              report.status === "Resolvido"
                                ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                                : report.status === "Em Análise"
                                ? "bg-blue-950/60 border-blue-800 text-blue-400"
                                : "bg-amber-950/60 border-amber-800 text-amber-400 animate-pulse"
                            }`}>
                              {report.status}
                            </span>
                          </div>

                          {/* Description */}
                          <div className="bg-black/80 border border-gray-900/80 p-3.5 rounded-xl text-xs text-gray-200 leading-relaxed">
                            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Relato do Usuário:</span>
                            {report.description}
                          </div>

                          {/* Existing Admin Reply preview if present */}
                          {report.adminReply && !isReplying && (
                            <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl text-xs text-emerald-300 space-y-1">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Resposta Enviada Anteriormente:
                              </span>
                              <p className="italic text-gray-300">"{report.adminReply}"</p>
                            </div>
                          )}

                          {/* User Reporter Info */}
                          <div className="text-[11px] text-gray-400 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gray-900">
                            <div>
                              Por: <strong className="text-gray-200">{report.userName}</strong> ({report.userEmail})
                            </div>
                            <div className="text-gray-500 text-[10px]">
                              {new Date(report.createdAt).toLocaleDateString("pt-BR")} às {new Date(report.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>

                        {/* Reply Drawer Inline inside card */}
                        {isReplying ? (
                          <div className="bg-black/90 border border-amber-900/50 p-4 rounded-2xl space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Responder a {report.userName}
                              </span>
                              <button
                                onClick={() => setReplyingReportId(null)}
                                className="text-gray-500 hover:text-white text-xs"
                              >
                                Cancelar
                              </button>
                            </div>

                            {/* Quick Presets */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase block">Respostas Rápidas:</span>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyText("✅ Corrigido! Link de reprodução e vídeos atualizados em alta qualidade. Bom filme!");
                                    setReplyStatus("Resolvido");
                                  }}
                                  className="text-[10px] bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-2 py-1 rounded-lg cursor-pointer"
                                >
                                  ✅ Vídeo Corrigido
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyText("🔍 Em análise! Nossa equipe identificou o problema e está re-processando os vídeos.");
                                    setReplyStatus("Em Análise");
                                  }}
                                  className="text-[10px] bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 px-2 py-1 rounded-lg cursor-pointer"
                                >
                                  🔍 Em Análise
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyText("ℹ️ Título sincronizado e testado! Limpe o cache do navegador e tente novamente.");
                                    setReplyStatus("Resolvido");
                                  }}
                                  className="text-[10px] bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 px-2 py-1 rounded-lg cursor-pointer"
                                >
                                  ℹ️ Testado & OK
                                </button>
                              </div>
                            </div>

                            {/* Reply Textarea */}
                            <textarea
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Digite sua resposta detalhada..."
                              className="w-full bg-black border border-gray-800 focus:border-amber-500 text-white text-xs p-2.5 rounded-xl resize-none"
                            />

                            {/* Status Selector */}
                            <div className="flex items-center justify-between gap-2">
                              <select
                                value={replyStatus}
                                onChange={(e) => setReplyStatus(e.target.value)}
                                className="bg-black border border-gray-800 text-white text-xs py-1.5 px-2 rounded-xl"
                              >
                                <option value="Resolvido">Marcar como Resolvido</option>
                                <option value="Em Análise">Marcar como Em Análise</option>
                                <option value="Pendente">Manter Pendente</option>
                              </select>

                              <button
                                type="button"
                                disabled={replySubmitting}
                                onClick={() => handleSendReportReply(report.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                {replySubmitting ? "Enviando..." : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Enviar e Notificar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Action Controls */
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-900">
                            <button
                              onClick={() => {
                                setReplyingReportId(report.id);
                                setReplyText(report.adminReply || "✅ Problema corrigido com sucesso! Obrigado pelo aviso.");
                                setReplyStatus("Resolvido");
                              }}
                              className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{report.adminReply ? "Editar Resposta" : "Responder Usuário"}</span>
                            </button>

                            <button
                              onClick={() => handleUpdateReportStatus(report.id, "Resolvido")}
                              disabled={report.status === "Resolvido"}
                              className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 disabled:opacity-40 text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Resolvido</span>
                            </button>

                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              className="bg-red-950/20 hover:bg-red-900/40 border border-red-900/40 text-red-400 p-2 rounded-xl transition-all cursor-pointer"
                              title="Excluir Denúncia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-16 text-center bg-[#0c0c0c] border border-gray-900 rounded-3xl space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-white text-base">Nenhuma denúncia encontrada</h4>
                <p className="text-xs text-gray-400">Não há relatórios de erro pendentes nesta busca ou filtro.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SITE STATS METRICS */}
        {activeSubTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat 1 */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-5 rounded-2xl flex items-center justify-between shadow-xl">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total de Filmes</span>
                <span className="text-3xl font-display font-black text-white mt-1 block">{totalMovies}</span>
              </div>
              <div className="p-3 bg-blue-950/30 rounded-xl text-blue-400">
                <Film className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-5 rounded-2xl flex items-center justify-between shadow-xl">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total de Séries</span>
                <span className="text-3xl font-display font-black text-white mt-1 block">{totalSeries}</span>
              </div>
              <div className="p-3 bg-red-950/30 rounded-xl text-red-400">
                <Tv className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-5 rounded-2xl flex items-center justify-between shadow-xl">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total de Animes</span>
                <span className="text-3xl font-display font-black text-white mt-1 block">{totalAnimes}</span>
              </div>
              <div className="p-3 bg-amber-950/30 rounded-xl text-amber-400">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-5 rounded-2xl flex items-center justify-between shadow-xl">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Títulos em Destaque</span>
                <span className="text-3xl font-display font-black text-rose-500 mt-1 block">{featuredTitles}</span>
              </div>
              <div className="p-3 bg-rose-950/30 rounded-xl text-rose-400">
                <Sparkle className="w-6 h-6" />
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:col-span-2 lg:col-span-4 mt-2">
              
              {/* Chart 1: Genres Bar Chart */}
              <div className="bg-[#0c0c0c] border border-gray-900/60 p-5 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <Film className="w-4 h-4 text-brand-primary" />
                    <span>Top 8 Gêneros no Catálogo</span>
                  </h3>
                  <span className="text-[10px] text-gray-500 font-mono">Qtd de Títulos</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genreData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#161616" horizontal={false} />
                      <XAxis type="number" stroke="#4b5563" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={10} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#060606", borderColor: "#1f2937", borderRadius: "12px", fontSize: "11px" }}
                        labelStyle={{ fontWeight: "bold", color: "#ffffff" }}
                      />
                      <Bar dataKey="value" fill="#e50914" radius={[0, 4, 4, 0]} barSize={14}>
                        {genreData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "#e50914" : "#b91c1c"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Type Distribution Donut Chart */}
              <div className="bg-[#0c0c0c] border border-gray-900/60 p-5 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                      <Tv className="w-4 h-4 text-red-400" />
                      <span>Distribuição por Tipo de Mídia</span>
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">Filme / Série / Anime</span>
                  </div>
                  <div className="h-48 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#060606", borderColor: "#1f2937", borderRadius: "12px", fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-white">{movies.length}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Títulos</span>
                    </div>
                  </div>
                </div>
                {/* Custom Legend */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-900/60 text-center">
                  {typeData.map((t, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-xs text-gray-300 font-medium">{t.name}</span>
                      </div>
                      <span className="text-sm font-bold text-white font-mono mt-0.5">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 3: Rating Distribution Area Chart */}
              <div className="bg-[#0c0c0c] border border-gray-900/60 p-5 rounded-3xl shadow-xl lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>Distribuição de Avaliações</span>
                  </h3>
                  <span className="text-[10px] text-gray-500 font-mono">Frequência de Notas</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ratingDistribution} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#161616" vertical={false} />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                      <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#060606", borderColor: "#1f2937", borderRadius: "12px", fontSize: "11px" }}
                        labelStyle={{ fontWeight: "bold", color: "#ffffff" }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRating)" name="Títulos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
            
            {/* Database & Workspace Health Card */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-6 rounded-3xl md:col-span-2 lg:col-span-4 mt-4 shadow-xl">
              <h3 className="text-base font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-brand-primary" />
                <span>Infraestrutura do PipocaMax</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-400">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-gray-950 pb-2">
                    <span>Estado do Banco de Dados</span>
                    <span className="text-emerald-400 font-semibold uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Conectado & Sincronizado
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-950 pb-2">
                    <span>Espaço em Cache local</span>
                    <span className="text-white font-mono font-semibold">100% Livre (Persistência Dupla)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine de Recomendação IA</span>
                    <span className="text-white font-semibold flex items-center gap-1 text-red-400">
                      Gemini 3.5 Flash (Disponível)
                    </span>
                  </div>
                </div>

                <div className="bg-[#121212]/30 p-4 border border-gray-950 rounded-2xl flex flex-col justify-between">
                  <p className="leading-relaxed mb-3">
                    O painel de controle sincroniza diretamente com seu banco de dados na nuvem (Firebase / Firestore). Caso nenhuma credencial esteja carregada no ambiente, o sistema utiliza o <strong>Mecanismo de Cache de Memória In-Memory</strong> para simular salvamentos e exclusões perfeitamente.
                  </p>
                  <p className="text-[10px] text-gray-500">Desenvolvido com o PipocaMax Engine v2.0</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: SETTINGS SUB-TAB */}
        {activeSubTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* CARD 1: SYSTEM MAINTENANCE MODE SETTINGS */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-6 md:p-8 rounded-3xl shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-900 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-500" />
                    <span>Modo de Manutenção do Sistema</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 font-sans">
                    Gerencie a acessibilidade do site para visitantes em tempo real. Administradores continuam com acesso irrestrito.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${
                    maintEnabled
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                      : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${maintEnabled ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
                    {maintEnabled ? "EM MANUTENÇÃO (ATIVO)" : "SISTEMA OPERANTE"}
                  </span>
                </div>
              </div>

              <div className="space-y-6 font-sans">
                {/* Master Toggle Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#141414] border border-gray-800">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white block">
                      Ativar Tela de Manutenção no Site
                    </span>
                    <span className="text-xs text-gray-400 block">
                      Quando ativado, visitantes e usuários comuns verão a tela de manutenção.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintEnabled(!maintEnabled)}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      maintEnabled ? "bg-amber-500" : "bg-gray-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        maintEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Customization Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block">
                      Título do Aviso
                    </label>
                    <input
                      type="text"
                      value={maintTitle}
                      onChange={(e) => setMaintTitle(e.target.value)}
                      placeholder="Ex: Estamos em Manutenção Programada ⚙️"
                      className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-4 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block">
                      Previsão de Retorno
                    </label>
                    <input
                      type="text"
                      value={maintReturn}
                      onChange={(e) => setMaintReturn(e.target.value)}
                      placeholder="Ex: Em breve (Algumas horas)"
                      className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-4 rounded-xl transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block">
                    Mensagem Descritiva para os Usuários
                  </label>
                  <textarea
                    rows={3}
                    value={maintMessage}
                    onChange={(e) => setMaintMessage(e.target.value)}
                    placeholder="Descreva o motivo da manutenção e agradeça a compreensão..."
                    className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 px-4 rounded-xl transition-all resize-none"
                  />
                </div>

                {/* Feedback Alerts */}
                {maintFeedback.error && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{maintFeedback.error}</span>
                  </div>
                )}

                {maintFeedback.success && (
                  <div className="p-3 bg-[#00d573]/10 border border-[#00d573]/20 text-[#00d573] text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{maintFeedback.success}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveMaintenanceToDb}
                    disabled={maintSaving}
                    className="w-full sm:flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20"
                  >
                    {maintSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando no Servidor...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>Salvar Configuração de Manutenção</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaintPreviewOpen(true)}
                    className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 text-gray-200 hover:text-white font-bold py-3 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Pré-visualizar Tela de Manutenção</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: TMDB API KEY SETTINGS */}
            <div className="bg-[#0c0c0c] border border-gray-900 p-6 md:p-8 rounded-3xl shadow-xl">
              <h3 className="text-lg font-bold text-gray-200 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-primary" />
                <span>Integração TMDB API Key (v3)</span>
              </h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed font-sans">
                Configure sua chave externa para importação automática em lote de títulos, pôsteres e trailers.
              </p>

              <div className="space-y-5 font-sans">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block">
                      Chave da API TMDB
                    </label>
                    <a 
                      href="https://www.themoviedb.org/settings/api" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline font-medium"
                    >
                      Obter Chave Grátis no TMDB →
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder="Cole sua chave da API do TMDB aqui..."
                      value={tmdbApiKey}
                      onChange={(e) => setTmdbApiKey(e.target.value)}
                      className="w-full bg-black border border-gray-800 focus:border-emerald-500 focus:outline-none text-white text-sm py-2.5 pl-4 pr-10 rounded-xl transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 cursor-pointer"
                      title={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 py-1 text-xs">
                  <span className="text-gray-400">Status da Chave TMDB:</span>
                  {tmdbApiKey ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Configurada & Ativa
                    </span>
                  ) : (
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      Não configurada
                    </span>
                  )}
                </div>

                {/* Error and Success feedback */}
                {settingsFeedback.error && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{settingsFeedback.error}</span>
                  </div>
                )}

                {settingsFeedback.success && (
                  <div className="p-3 bg-[#00d573]/10 border border-[#00d573]/20 text-[#00d573] text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{settingsFeedback.success}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveSettingsToDb}
                  disabled={savingSettings}
                  className="w-full bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/10 hover:scale-101 mt-2"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Chave...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Salvar Chave TMDB no Banco</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAINTENANCE SCREEN PREVIEW MODAL */}
        <AnimatePresence>
          {maintPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] bg-black flex flex-col"
            >
              {/* Preview Banner */}
              <div className="bg-amber-600/90 text-white px-6 py-3 flex items-center justify-between text-xs font-bold border-b border-amber-500 shadow-md">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-white" />
                  <span>MOTO DE PRÉ-VISUALIZAÇÃO DA TELA DE MANUTENÇÃO (É COMO OS VISITANTES VERÃO SE ATIVADO)</span>
                </div>
                <button
                  onClick={() => setMaintPreviewOpen(false)}
                  className="bg-black/40 hover:bg-black/60 text-white px-3 py-1.5 rounded-lg border border-white/20 transition-all cursor-pointer font-extrabold"
                >
                  ✕ Fechar Pré-visualização
                </button>
              </div>

              {/* Render actual maintenance screen */}
              <div className="flex-1 overflow-auto">
                <MaintenanceScreen
                  title={maintTitle}
                  message={maintMessage}
                  estimatedReturn={maintReturn}
                  onAdminLogin={() => {
                    showToast("No modo real, este botão permite login para administradores.", "info");
                    setMaintPreviewOpen(false);
                  }}
                  onRefreshStatus={() => {
                    showToast("Simulação de verificação de status no modo de pré-visualização.", "info");
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FORM MODAL: ADD / EDIT TITLE */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" 
              onClick={() => setIsFormOpen(false)}
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl bg-[#0f0f0f] border border-gray-900 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 md:p-8 max-h-[90vh] overflow-y-auto"
              id="title-form-box"
            >
              {/* Close button */}
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-gray-900"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-display font-black text-white mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-primary" />
                <span>{editingMovie ? `Editar: ${editingMovie.title}` : "Cadastrar Novo Título"}</span>
              </h2>
              <p className="text-xs text-gray-400 mb-6">
                Preencha as informações técnicas do filme, série ou anime para atualizar o catálogo do PipocaMax.
              </p>

              {/* Error and Success states */}
              {formError && (
                <div className="mb-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs p-3.5 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{formError}</p>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <p>{formSuccess}</p>
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={handleFormSubmit} className="space-y-5" id="form-title-editor">
                
                {/* Line 1: Title & Original Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Título em Português</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Interestelar"
                      required
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Título Original (Inglês/Japão)</label>
                    <input 
                      type="text" 
                      value={originalTitle}
                      onChange={(e) => setOriginalTitle(e.target.value)}
                      placeholder="Ex: Interstellar"
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {/* Line 2: Type, Year, Duration, Rating */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Tipo de Título</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <option value="filme">Filme</option>
                      <option value="serie">Série</option>
                      <option value="anime">Anime</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Ano de Lançamento</label>
                    <input 
                      type="number" 
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      required
                      min={1900}
                      max={2100}
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Duração (Temp/Min)</label>
                    <input 
                      type="text" 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="Ex: 2h 49min ou 4 Temporadas"
                      required
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Nota de Avaliação (★)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      required
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Line 3: Genres & Director & IMDB */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Gêneros (Separados por vírgula)</label>
                    <input 
                      type="text" 
                      value={genres}
                      onChange={(e) => setGenres(e.target.value)}
                      placeholder="Ex: Ficção Científica, Aventura, Drama"
                      required
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">IMDB ID (Opcional)</label>
                    <input 
                      type="text" 
                      value={imdbId}
                      onChange={(e) => setImdbId(e.target.value)}
                      placeholder="Ex: tt0816692"
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Director and Cast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Diretor / Criador</label>
                    <input 
                      type="text" 
                      value={director}
                      onChange={(e) => setDirector(e.target.value)}
                      placeholder="Ex: Christopher Nolan"
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Elenco Principal (Separados por vírgula)</label>
                    <input 
                      type="text" 
                      value={cast}
                      onChange={(e) => setCast(e.target.value)}
                      placeholder="Ex: Matthew McConaughey, Anne Hathaway"
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {/* Media Links: Poster & Backdrop & YouTube Trailer */}
                <div className="space-y-3 bg-black/30 border border-gray-950 p-4 rounded-2xl">
                  <span className="text-[11px] text-gray-300 font-extrabold uppercase tracking-wider block border-b border-gray-900 pb-2 mb-2">Imagens e Vídeo Trailer</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">URL Imagem do Poster (Vertical)</label>
                      <input 
                        type="url" 
                        value={posterUrl}
                        onChange={(e) => setPosterUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        required
                        className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">URL Imagem de Fundo (Horizontal Banner)</label>
                      <input 
                        type="url" 
                        value={backdropUrl}
                        onChange={(e) => setBackdropUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        required
                        className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ID do Vídeo de Trailer (YouTube ID apenas)</label>
                    <input 
                      type="text" 
                      value={trailerVideoId}
                      onChange={(e) => setTrailerVideoId(e.target.value)}
                      placeholder="Ex: dQw4w9WgXcQ (Apenas o código após 'v=')"
                      required
                      className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Synopsis */}
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Sinopse da História</label>
                  <textarea 
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="Escreva um breve resumo cativante sobre a história..."
                    required
                    rows={3}
                    className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2 px-3 rounded-xl transition-all resize-none"
                  />
                </div>

                {/* Featured Checkbox */}
                <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-gray-900 w-max">
                  <input 
                    type="checkbox" 
                    id="featured-checkbox" 
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-red-600 accent-red-600 bg-black border-gray-900 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="featured-checkbox" className="text-xs font-bold text-gray-300 cursor-pointer select-none">
                    Destacar este título no Carrossel da página inicial
                  </label>
                </div>

                {/* Actions button */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-950">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-900 text-gray-400 hover:text-white hover:bg-gray-900 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-red-600/15 cursor-pointer flex items-center gap-1"
                  >
                    {formSubmitting ? "Salvando..." : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TMDB SEARCH & IMPORT MODAL */}
      <AnimatePresence>
        {isTmdbSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer" 
              onClick={() => setIsTmdbSearchOpen(false)}
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-5xl bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl z-10 p-4 sm:p-6 md:p-8 max-h-[92vh] flex flex-col text-left"
            >
              {/* Close button */}
              <button 
                onClick={() => setIsTmdbSearchOpen(false)}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-gray-500 hover:text-white transition-colors cursor-pointer p-2 rounded-full hover:bg-gray-900 z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pr-8 shrink-0">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Catálogo Oficial TMDB (v3 API)</span>
                  </div>
                  <h3 className="font-display font-black text-lg sm:text-2xl text-white">
                    Importar Filmes, Séries & Animes
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {tmdbApiKey ? (
                    <span className="text-[11px] sm:text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>API TMDB Conectada</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setIsTmdbSearchOpen(false);
                        setActiveSubTab("settings");
                      }}
                      className="text-[11px] sm:text-xs text-amber-400 bg-amber-950/60 border border-amber-800/60 hover:bg-amber-900/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Configurar API em Configurações →</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4">

                {/* API Missing Warning Banner */}
                {!tmdbApiKey && (
                  <div className="bg-amber-950/30 border border-amber-800/60 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span className="text-amber-200 text-left">
                        A chave da API do TMDB não está configurada. Vá para a aba <strong>Configurações</strong> para informar sua chave.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setIsTmdbSearchOpen(false);
                        setActiveSubTab("settings");
                      }}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-xl shrink-0 cursor-pointer text-xs"
                    >
                      Ir para Configurações
                    </button>
                  </div>
                )}

                {/* Mode Tabs: Manual Search vs Automatic Batch Import */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-gray-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setImportTab("search")}
                    className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importTab === "search"
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black"
                        : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>Busca & Seleção Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportTab("batch")}
                    className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importTab === "batch"
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black"
                        : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse fill-amber-400" />
                    <span>Importação Automática em Lote</span>
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.5 rounded uppercase font-extrabold">
                      Lote
                    </span>
                  </button>
                </div>

                {/* BATCH AUTO-IMPORT INTERFACE */}
                {importTab === "batch" && (
                  <div className="bg-[#121212] border border-gray-800 p-4 sm:p-5 rounded-2xl space-y-4 sm:space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span>Importação Automática em Lote do TMDB</span>
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          Defina quantos títulos deseja adicionar de uma vez. O PipocaMax irá pesquisar no TMDB e cadastrar automaticamente os novos títulos com pôsteres, sinopses, elencos e trailers.
                        </p>
                      </div>
                    </div>

                    {/* Batch Controls Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                      {/* Target count input + presets */}
                      <div className="md:col-span-6 space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                          Quantos Títulos Adicionar de Vez?
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={batchTargetCount}
                            onChange={(e) => setBatchTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 sm:w-24 bg-black border border-gray-800 rounded-xl px-3 py-2 text-sm text-center font-bold text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 shrink-0"
                            disabled={batchRunning}
                          />
                          <div className="flex flex-wrap items-center gap-1">
                            {[5, 10, 20, 50].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setBatchTargetCount(num)}
                                disabled={batchRunning}
                                className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  batchTargetCount === num
                                    ? "bg-emerald-500 text-black font-black"
                                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Media Type */}
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                          Conteúdo
                        </label>
                        <select
                          value={batchType}
                          onChange={(e: any) => setBatchType(e.target.value)}
                          disabled={batchRunning}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold h-[38px]"
                        >
                          <option value="todos">Todos</option>
                          <option value="filme">Apenas Filmes</option>
                          <option value="serie">Apenas Séries</option>
                          <option value="anime">Apenas Animes</option>
                        </select>
                      </div>

                      {/* Year */}
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                          Ano Lançamento
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 2026"
                          value={batchYear}
                          onChange={(e) => setBatchYear(e.target.value)}
                          disabled={batchRunning}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 h-[38px]"
                        />
                      </div>
                    </div>

                    {/* Batch Start/Stop Button */}
                    <div className="pt-2">
                      {batchRunning ? (
                        <div className="space-y-3 bg-black/60 border border-emerald-900/50 p-3.5 sm:p-4 rounded-xl">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs font-bold text-emerald-400">
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                              <span>Importando automaticamente em lote...</span>
                            </span>
                            <span className="font-mono text-white text-[11px] sm:text-xs">
                              {batchProgress?.current || 0} / {batchProgress?.total || batchTargetCount} (
                              {Math.round(((batchProgress?.current || 0) / (batchProgress?.total || 1)) * 100)}%)
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden border border-gray-800">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                              style={{
                                width: `${Math.min(100, Math.round(((batchProgress?.current || 0) / (batchProgress?.total || 1)) * 100))}%`
                              }}
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-400">
                            <span className="truncate max-w-full sm:max-w-md font-medium text-white">
                              🎬 Processando: <span className="text-emerald-300 font-bold">{batchProgress?.currentTitle}</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleStopBatch}
                              className="w-full sm:w-auto bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer flex items-center justify-center gap-1 shrink-0"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>Parar Importação</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRunBatchAutoImport}
                          disabled={!tmdbApiKey}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-800 text-black disabled:text-gray-500 font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Iniciar Importação Automática de {batchTargetCount} Títulos</span>
                        </button>
                      )}
                    </div>

                    {/* Batch Completion Summary */}
                    {batchResultSummary && (
                      <div className="bg-emerald-950/30 border border-emerald-800/60 p-3.5 sm:p-4 rounded-xl text-xs space-y-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Importação em Lote Concluída!</span>
                          </span>
                          <span className="bg-emerald-500 text-black font-black px-2.5 py-0.5 rounded-full font-mono text-[11px]">
                            +{batchResultSummary.added} Novos Títulos
                          </span>
                        </div>
                        {batchResultSummary.titles.length > 0 && (
                          <div className="pt-2 border-t border-emerald-900/40">
                            <span className="text-[10px] text-gray-400 block mb-1 font-bold uppercase">
                              Títulos Adicionados:
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                              {batchResultSummary.titles.map((t, idx) => (
                                <span key={idx} className="bg-black/80 border border-emerald-800/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MANUAL SEARCH INTERFACE */}
                {importTab === "search" && (
                  <>
                    {/* Responsive Search & Filters Toolbar */}
                    <form 
                      onSubmit={(e) => handleTmdbSearch(e, 1)} 
                      className="bg-[#121212] border border-gray-800/80 p-3 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      {/* Search query input */}
                      <div className="sm:col-span-5 relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input 
                          type="text"
                          placeholder="Pesquisar por título (ou deixe vazio)..."
                          value={tmdbSearchQuery}
                          onChange={(e) => setTmdbSearchQuery(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>

                      {/* Year Filter input */}
                      <div className="sm:col-span-3 flex items-center gap-1.5 bg-black border border-gray-800 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Ano:</span>
                        <input 
                          type="number"
                          placeholder="Ex: 2026"
                          min={1900}
                          max={2100}
                          value={tmdbSearchYear}
                          onChange={(e) => setTmdbSearchYear(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-emerald-400 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Type Filter selector */}
                      <div className="sm:col-span-2">
                        <select
                          value={tmdbSearchType}
                          onChange={(e: any) => setTmdbSearchType(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                        >
                          <option value="todos">Todos</option>
                          <option value="filme">Filmes</option>
                          <option value="serie">Séries</option>
                          <option value="anime">Animes</option>
                        </select>
                      </div>

                      {/* Submit button */}
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={tmdbLoading}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-800 text-black disabled:text-gray-500 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          {tmdbLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5" />
                              <span>Buscar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Status Header */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-1">
                      <span>
                        {tmdbSearchQuery ? (
                          <>Resultados para "<strong>{tmdbSearchQuery}</strong>"</>
                        ) : (
                          <>Lançamentos e Populares {tmdbSearchYear ? `de ${tmdbSearchYear}` : ""}</>
                        )}
                        {tmdbTotalResults > 0 && ` (${tmdbTotalResults} encontrados)`}
                      </span>

                      {tmdbTotalPages > 1 && (
                        <span className="font-mono text-gray-500">
                          Página <strong className="text-white">{tmdbPage}</strong> de {tmdbTotalPages}
                        </span>
                      )}
                    </div>

                    {/* Grid of Results */}
                    <div className="min-h-[250px]">
                      {tmdbLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
                          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                          <span className="text-xs">Carregando catálogo do TMDB...</span>
                        </div>
                      ) : tmdbSearchResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tmdbSearchResults.map((item) => {
                            const isAdded = isAlreadyInCatalog(item);
                            const isDirectImporting = directImportingId === (item.tmdbId || item.id);
                            const isDetailImporting = importingId === (item.tmdbId || item.id);

                            return (
                              <div 
                                key={item.id}
                                className={`bg-[#111111] border rounded-2xl p-2.5 flex gap-3 transition-all relative overflow-hidden ${
                                  isAdded ? "border-emerald-900/50 bg-emerald-950/10" : "border-gray-900 hover:border-gray-800"
                                }`}
                              >
                                {/* Poster */}
                                <img 
                                  src={item.posterUrl} 
                                  alt={item.title} 
                                  className="w-16 h-24 object-cover rounded-xl bg-gray-950 shrink-0 shadow-md"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  decoding="async"
                                />

                                {/* Info */}
                                <div className="flex flex-col justify-between flex-grow min-w-0 py-0.5">
                                  <div>
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                      <h4 className="font-bold text-xs text-white truncate leading-snug" title={item.title}>
                                        {item.title}
                                      </h4>
                                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                        item.type === "anime" 
                                          ? "bg-amber-950 text-amber-400 border border-amber-900/40"
                                          : item.type === "serie"
                                          ? "bg-purple-950 text-purple-300 border border-purple-900/40"
                                          : "bg-red-950 text-red-400 border border-red-900/40"
                                      }`}>
                                        {item.type}
                                      </span>
                                    </div>

                                    {item.originalTitle && item.originalTitle !== item.title && (
                                      <p className="text-[10px] text-gray-500 truncate mb-1">
                                        {item.originalTitle}
                                      </p>
                                    )}

                                    <p className="text-[11px] text-gray-400 font-medium">
                                      📅 {item.year} • <span className="text-amber-400 font-bold">★ {item.rating ? item.rating.toFixed(1) : "0.0"}</span>
                                    </p>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="pt-2 flex items-center gap-1.5">
                                    {isAdded ? (
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1 w-full justify-center">
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span>No Catálogo</span>
                                      </span>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleDirectImportTmdb(item)}
                                          disabled={isDirectImporting || isDetailImporting}
                                          className="flex-grow bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-800 text-black disabled:text-gray-500 text-[10px] font-bold py-1.2 px-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                                          title="Importar título diretamente para o banco de dados em 1 clique"
                                        >
                                          {isDirectImporting ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-black" />
                                          ) : (
                                            <>
                                              <Plus className="w-3 h-3" />
                                              <span>Adicionar</span>
                                            </>
                                          )}
                                        </button>

                                        <button
                                          onClick={() => handleImportTmdb(item.id, item.type === "filme" ? "filme" : "serie")}
                                          disabled={isDirectImporting || isDetailImporting}
                                          className="bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white text-[10px] font-bold py-1.2 px-2 rounded-lg cursor-pointer transition-all border border-gray-800"
                                          title="Abrir no formulário para personalizar antes de salvar"
                                        >
                                          {isDetailImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Editar"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-2">
                          <Sparkles className="w-8 h-8 text-gray-700 animate-pulse" />
                          <span className="text-xs font-medium">Nenhum título encontrado para esses filtros.</span>
                          <button 
                            onClick={() => {
                              setTmdbSearchQuery("");
                              setTmdbSearchYear("2026");
                              setTmdbSearchType("todos");
                              handleTmdbSearch(undefined, 1);
                            }}
                            className="text-xs text-emerald-400 underline font-bold mt-1"
                          >
                            Redefinir Filtros
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pagination Controls Footer */}
                    {tmdbTotalPages > 1 && (
                      <div className="pt-3 border-t border-gray-900 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleTmdbSearch(undefined, tmdbPage - 1)}
                          disabled={tmdbPage <= 1 || tmdbLoading}
                          className="px-4 py-2 bg-[#121212] hover:bg-gray-900 border border-gray-800 disabled:opacity-40 text-gray-300 rounded-xl font-bold cursor-pointer transition-all disabled:cursor-not-allowed"
                        >
                          ← Anterior
                        </button>

                        <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px]">
                          <span>Página</span>
                          <strong className="text-white px-2 py-1 bg-black rounded-lg border border-gray-800">{tmdbPage}</strong>
                          <span>de {tmdbTotalPages}</span>
                        </div>

                        <button
                          onClick={() => handleTmdbSearch(undefined, tmdbPage + 1)}
                          disabled={tmdbPage >= tmdbTotalPages || tmdbLoading}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400/50 disabled:opacity-40 text-black disabled:text-gray-500 rounded-xl font-bold cursor-pointer transition-all disabled:cursor-not-allowed"
                        >
                          Próxima →
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Error message if any */}
                {tmdbError && (
                  <div className="bg-red-950/30 border border-red-900/50 text-red-300 text-xs p-3 rounded-xl flex items-center justify-between">
                    <span>{tmdbError}</span>
                    <button 
                      onClick={() => setTmdbError("")}
                      className="text-gray-400 hover:text-white text-[10px] font-bold underline"
                    >
                      Fechar
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER MANAGEMENT ADD/EDIT MODAL */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-900">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-950/40 rounded-xl border border-red-900/40 text-red-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    {editingUser ? "Editar Usuário" : "Adicionar Novo Usuário"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-gray-950 border border-gray-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUserModal} className="mt-4 space-y-4">
                {userModalError && (
                  <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs font-medium">
                    {userModalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-black border border-gray-800 focus:border-red-600 focus:outline-none text-white text-xs px-3.5 py-2.5 rounded-xl transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    value={userEmailInput}
                    onChange={(e) => setUserEmailInput(e.target.value)}
                    placeholder="Ex: joao@email.com"
                    className="w-full bg-black border border-gray-800 focus:border-red-600 focus:outline-none text-white text-xs px-3.5 py-2.5 rounded-xl transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    {editingUser ? "Nova Senha (deixe em branco para manter a atual)" : "Senha de Acesso *"}
                  </label>
                  <input
                    type="password"
                    value={userPasswordInput}
                    onChange={(e) => setUserPasswordInput(e.target.value)}
                    placeholder={editingUser ? "••••••••" : "Digite a senha..."}
                    className="w-full bg-black border border-gray-800 focus:border-red-600 focus:outline-none text-white text-xs px-3.5 py-2.5 rounded-xl transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Nível de Acesso (Papel)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUserRoleInput("user")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        userRoleInput === "user"
                          ? "bg-gray-800 border-gray-600 text-white shadow-lg"
                          : "bg-black border-gray-900 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Usuário Comum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserRoleInput("admin")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        userRoleInput === "admin"
                          ? "bg-red-950/60 border-red-700 text-red-300 shadow-lg"
                          : "bg-black border-gray-900 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Administrador</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-900">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={userModalSubmitting}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {userModalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingUser ? "Salvar Alterações" : "Criar Usuário"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
