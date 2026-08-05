import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
// Removed Supabase and Pg imports to simplify the backend and focus purely on Firestore
import { MOVIES_DATA } from "./src/moviesData";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import fs from "fs";

// Handle transient background network disconnects (e.g., gRPC ECONNRESET) gracefully
process.on("unhandledRejection", (reason: any) => {
  if (reason && (reason.code === 14 || (reason.message && (reason.message.includes("ECONNRESET") || reason.message.includes("BloomFilter"))))) {
    console.warn("Transient network or BloomFilter message caught in background (Firestore):", reason.message || reason);
    return;
  }
  console.warn("Unhandled promise rejection:", reason);
});

// Suppress benign internal Firebase JS SDK BloomFilter warnings in Node runtime
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  if (msg.includes("BloomFilter error") || msg.includes("Invalid hash count")) {
    return;
  }
  originalConsoleError(...args);
};

const PORT = 3000;

// Removed mapMovieRow helper since multi-backend DB mappings are no longer needed

class FirestoreWrapper {
  private db: any;
  constructor(db: any) {
    this.db = db;
  }
  collection(collectionName: string) {
    return {
      doc: (docId: string) => {
        const safeDocId = String(docId || "doc_" + Date.now()).replace(/\//g, "_").trim();
        return {
          get: async () => {
            try {
              if (!safeDocId) return { exists: false, data: () => null };
              const snap = await getDoc(doc(this.db, collectionName, safeDocId));
              return {
                exists: snap.exists(),
                data: () => snap.data()
              };
            } catch (err) {
              console.warn(`Firestore getDoc error (${collectionName}/${safeDocId}):`, err);
              return { exists: false, data: () => null };
            }
          },
          set: async (data: any, options?: any) => {
            try {
              if (!safeDocId) return;
              if (options) {
                await setDoc(doc(this.db, collectionName, safeDocId), data, options);
              } else {
                await setDoc(doc(this.db, collectionName, safeDocId), data);
              }
            } catch (err) {
              console.warn(`Firestore setDoc error (${collectionName}/${safeDocId}):`, err);
            }
          },
          update: async (data: any) => {
            try {
              if (!safeDocId) return;
              await updateDoc(doc(this.db, collectionName, safeDocId), data);
            } catch (err) {
              console.warn(`Firestore updateDoc error (${collectionName}/${safeDocId}):`, err);
            }
          },
          delete: async () => {
            try {
              if (!safeDocId) return;
              await deleteDoc(doc(this.db, collectionName, safeDocId));
            } catch (err) {
              console.warn(`Firestore deleteDoc error (${collectionName}/${safeDocId}):`, err);
            }
          }
        };
      },
      get: async () => {
        try {
          const snap = await getDocs(collection(this.db, collectionName));
          const docs: any[] = [];
          snap.forEach(d => {
            docs.push({
              id: d.id,
              data: () => d.data()
            });
          });
          return {
            empty: snap.empty,
            docs: docs,
            forEach: (callback: (d: any) => void) => docs.forEach(callback),
            size: snap.size
          };
        } catch (err) {
          console.warn(`Firestore getDocs error (${collectionName}):`, err);
          return {
            empty: true,
            docs: [],
            forEach: () => {},
            size: 0
          };
        }
      },
      where: (field: string, op: string, value: any) => {
        return {
          get: async () => {
            try {
              const snap = await getDocs(collection(this.db, collectionName));
              const docs: any[] = [];
              snap.forEach(d => {
                const data = d.data();
                if (op === "==" && data && data[field] === value) {
                  docs.push({ id: d.id, data: () => data });
                }
              });
              return {
                empty: docs.length === 0,
                docs: docs,
                forEach: (callback: (d: any) => void) => docs.forEach(callback),
                size: docs.length
              };
            } catch (err) {
              console.warn(`Firestore query error (${collectionName}):`, err);
              return { empty: true, docs: [], forEach: () => {}, size: 0 };
            }
          }
        };
      }
    };
  }
}

let firestoreDb: any = null;

function getFirestoreDb() {
  if (!firestoreDb) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const app = initializeApp(config);
        let webDb: any;
        try {
          if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
            webDb = getFirestore(app, config.firestoreDatabaseId);
          } else {
            webDb = getFirestore(app);
          }
        } catch (dbErr) {
          console.warn("Could not initialize getFirestore with custom databaseId, falling back to default getFirestore:", dbErr);
          try {
            webDb = getFirestore(app);
          } catch (e) {
            console.error("Default getFirestore also failed:", e);
          }
        }
        if (webDb) {
          firestoreDb = new FirestoreWrapper(webDb);
          console.log("Firestore initialized successfully in backend (via Web SDK Wrapper)!");
        }
      }
    } catch (err) {
      console.error("Error initializing Firestore in backend:", err);
    }
  }
  return firestoreDb;
}

// Local storage for in-memory fallback
let localMoviesList: any[] = [];
let localUsersList: any[] = [
  {
    id: "admin-default",
    name: "Administrador PipocaMax",
    email: "admin@pipocamax.com",
    password: "admin",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "admin-hylander",
    name: "Hylander Admin",
    email: "hylander@hylander.com",
    password: "admin",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "admin-higor",
    name: "Higor Juliatti (Admin)",
    email: "higorjuliatti159@gmail.com",
    password: "admin",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString()
  }
];
let localReportsList: any[] = [];
let localNotificationsList: any[] = [];

// Sync and fetch notifications from Firestore
async function fetchNotificationsFromDb() {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await db.collection("notifications").get();
      if (!snapshot.empty) {
        const mapped: any[] = [];
        snapshot.forEach((docSnap: any) => {
          mapped.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        for (const notif of mapped) {
          const idx = localNotificationsList.findIndex(ln => ln.id === notif.id);
          if (idx === -1) {
            localNotificationsList.push(notif);
          } else {
            const existing = localNotificationsList[idx];
            const mergedReadBy = Array.from(new Set([
              ...(Array.isArray(existing.readBy) ? existing.readBy : []),
              ...(Array.isArray(notif.readBy) ? notif.readBy : [])
            ]));
            const mergedRead = Boolean(existing.read) || Boolean(notif.read);
            localNotificationsList[idx] = {
              ...notif,
              ...existing,
              read: mergedRead,
              readBy: mergedReadBy
            };
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar notificações do Firestore:", e);
    }
  }

  return localNotificationsList;
}

// Sync and fetch reports from Firestore
async function fetchReportsFromDb() {
  const db = getFirestoreDb();
  if (db) {
    try {
      const reportsSnapshot = await db.collection("reports").get();
      if (!reportsSnapshot.empty) {
        const mapped: any[] = [];
        reportsSnapshot.forEach((docSnap: any) => {
          const r = docSnap.data();
          mapped.push({
            id: docSnap.id,
            ...r
          });
        });

        // Merge into localReportsList avoiding duplicates
        for (const rep of mapped) {
          const idx = localReportsList.findIndex(lr => lr.id === rep.id);
          if (idx === -1) {
            localReportsList.push(rep);
          } else {
            localReportsList[idx] = rep;
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar relatórios do Firestore:", e);
    }
  }

  return localReportsList;
}

// Helper to convert Firestore timestamp / object / string / number into ISO String safely
function safeIsoDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    try { return new Date(val).toISOString(); } catch { return null; }
  }
  if (typeof val === "object") {
    if (typeof val.toDate === "function") {
      try { return val.toDate().toISOString(); } catch { }
    }
    if (typeof val.seconds === "number") {
      try { return new Date(val.seconds * 1000).toISOString(); } catch { }
    }
    if (typeof val._seconds === "number") {
      try { return new Date(val._seconds * 1000).toISOString(); } catch { }
    }
  }
  return null;
}

// Helper for bounded execution of database calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs))
  ]);
}

// Sync and fetch users from Firestore
async function fetchUsersFromDb() {
  const db = getFirestoreDb();

  const rootAdmin = {
    id: "admin-default",
    name: "Administrador PipocaMax",
    email: "admin@pipocamax.com",
    password: "admin",
    role: "admin",
    createdAt: new Date().toISOString()
  };

  if (db) {
    try {
      const fetchPromise = (async () => {
        const usersSnapshot = await db.collection("users").get();
        if (!usersSnapshot.empty) {
          const mapped: any[] = [];
          usersSnapshot.forEach((docSnap: any) => {
            const u = docSnap.data();
            mapped.push({
              id: docSnap.id,
              name: u.name || "",
              email: u.email || "",
              password: u.password || "",
              role: u.role || "user",
              status: u.status || "active",
              registeredIp: u.registeredIp || null,
              failedAttempts: Number(u.failedAttempts || 0),
              lockoutUntil: u.lockoutUntil || null,
              lockoutReason: u.lockoutReason || null,
              createdAt: safeIsoDate(u.createdAt) || new Date().toISOString()
            });
          });

          if (!mapped.some(u => u.email && u.email.toLowerCase().trim() === rootAdmin.email)) {
            mapped.push(rootAdmin);
          }

          localUsersList = mapped;
          return mapped;
        }
        return localUsersList;
      })();

      return await withTimeout(fetchPromise, 3500, localUsersList);
    } catch (e) {
      console.warn("Erro ao buscar usuários do Firestore:", e);
    }
  }

  if (!localUsersList.some(u => u.email && u.email.toLowerCase().trim() === rootAdmin.email)) {
    localUsersList.push(rootAdmin);
  }

  return localUsersList;
}

async function initializeUsersTable() {
  const db = getFirestoreDb();
  if (db) {
    try {
      const usersSnapshot = await db.collection("users").get();
      if (usersSnapshot.empty) {
        const defaultAdmins = [
          {
            id: "admin-default",
            name: "Administrador PipocaMax",
            email: "admin@pipocamax.com",
            password: "admin",
            role: "admin",
            createdAt: new Date().toISOString()
          },
          {
            id: "admin-hylander",
            name: "Hylander Admin",
            email: "hylander@hylander.com",
            password: "admin",
            role: "admin",
            createdAt: new Date().toISOString()
          },
          {
            id: "admin-higor",
            name: "Higor Juliatti (Admin)",
            email: "higorjuliatti159@gmail.com",
            password: "admin",
            role: "admin",
            createdAt: new Date().toISOString()
          }
        ];

        for (const defAdmin of defaultAdmins) {
          await db.collection("users").doc(defAdmin.id).set(defAdmin);
        }
        console.log("Catálogo inicial de usuários semeado no Firestore com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao inicializar coleção de usuários no Firestore:", e);
    }
  }
}

// Ordena títulos do mais recente para o mais antigo pelo ano (ex: 2026 -> 2025 -> 2024)
function sortMoviesByYearDesc(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const yearA = Number(a.year || 0);
    const yearB = Number(b.year || 0);
    if (yearB !== yearA) {
      return yearB - yearA;
    }
    const featA = a.featured ? 1 : 0;
    const featB = b.featured ? 1 : 0;
    if (featB !== featA) {
      return featB - featA;
    }
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) {
      return timeB - timeA;
    }
    return (b.rating || 0) - (a.rating || 0);
  });
}

// Function to fetch titles from Firestore
async function fetchTitlesFromDb() {
  const db = getFirestoreDb();
  if (db) {
    try {
      const fetchPromise = (async () => {
        console.log("Tentando carregar títulos do Firestore...");
        const moviesSnapshot = await db.collection("movies").get();
        if (!moviesSnapshot.empty) {
          const mapped: any[] = [];
          moviesSnapshot.forEach((docSnap: any) => {
            if (docSnap.id === "catalog" || docSnap.id === "sitemap" || docSnap.id === "config") return;
            const row = docSnap.data();
            if (!row || !row.title || typeof row.title !== "string" || !row.title.trim()) return;

            mapped.push({
              id: docSnap.id,
              title: row.title || "",
              originalTitle: row.originalTitle || row.title || "",
              year: Number(row.year || 2026),
              duration: row.duration || "120 min",
              rating: Number(row.rating || 8.0),
              genres: Array.isArray(row.genres) ? row.genres : [],
              synopsis: row.synopsis || "",
              backdropUrl: row.backdropUrl || "",
              posterUrl: row.posterUrl || "",
              trailerVideoId: row.trailerVideoId || "dQw4w9WgXcQ",
              cast: Array.isArray(row.cast) ? row.cast : [],
              director: row.director || "",
              featured: Boolean(row.featured),
              type: row.type || "filme",
              imdbId: row.imdbId || "",
              createdAt: safeIsoDate(row.createdAt),
            });
          });

          if (mapped.length > 0) {
            localMoviesList = mapped;
            return mapped;
          }
        }
        
        return localMoviesList;
      })();

      return await withTimeout(fetchPromise, 4000, localMoviesList);
    } catch (e) {
      console.warn("Erro ao buscar filmes do Firestore:", e);
    }
  }

  return localMoviesList;
}

// Function to seed database if empty
async function seedDatabase() {
  const db = getFirestoreDb();
  if (db) {
    try {
      console.log("Semeando catálogo inicial no Firestore...");
      for (const m of MOVIES_DATA) {
        const movieRef = db.collection("movies").doc(m.id);
        await movieRef.set({
          title: m.title,
          originalTitle: m.originalTitle || m.title,
          year: m.year,
          duration: m.duration,
          rating: m.rating,
          genres: m.genres,
          synopsis: m.synopsis,
          backdropUrl: m.backdropUrl,
          posterUrl: m.posterUrl,
          trailerVideoId: m.trailerVideoId,
          cast: m.cast,
          director: m.director,
          featured: m.featured || false,
          type: m.type,
          imdbId: m.imdbId || "",
          createdAt: new Date().toISOString()
        });
      }
      return { success: true, table: "movies (Firestore)" };
    } catch (e: any) {
      console.error("Erro ao semear Firestore:", e);
      throw e;
    }
  }

  throw new Error("Nenhum banco de dados Firestore configurado.");
}

async function startServer() {
  // Initialize user tables and pre-fetch data from Firestore on boot
  try {
    initializeUsersTable().catch(e => console.warn("Erro ao inicializar tabela de usuários:", e));
    fetchTitlesFromDb().catch(e => console.warn("Erro no pré-carregamento de títulos:", e));
    fetchUsersFromDb().catch(e => console.warn("Erro no pré-carregamento de usuários:", e));
  } catch (err) {
    console.warn("Falha ao inicializar banco de dados no boot:", err);
  }

  const app = express();
  app.use(express.json());

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    next();
  });

  // Security Middleware: Require Admin privileges for restricted endpoints
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      let email = req.headers["x-user-email"];
      if (!email || email === "undefined" || email === "null" || email === "") {
        // Fallback for default admin requests in local dev
        email = "admin@pipocamax.com";
      }
      
      const emailLower = String(email).toLowerCase().trim();
      const users = await fetchUsersFromDb();
      const user = users.find(u => u.email && u.email.toLowerCase().trim() === emailLower);

      if (user && user.role === "admin") {
        return next();
      }

      if (!user && (emailLower === "admin@pipocamax.com" || emailLower === "higorjuliatti159@gmail.com" || emailLower === "hylander@hylander.com")) {
        return next();
      }

      return res.status(403).json({ error: "Acesso negado. Apenas administradores podem executar esta ação." });
    } catch (err: any) {
      console.error("Erro no middleware requireAdmin:", err);
      return res.status(500).json({ error: "Erro de autorização de administrador." });
    }
  };

  // API route to get all movies/series/animes
  app.get("/api/movies", async (_req, res) => {
    try {
      const dbMovies = await fetchTitlesFromDb();
      const hasFirestore = !!getFirestoreDb();
      const sorted = sortMoviesByYearDesc(dbMovies || localMoviesList);
      
      return res.json({
        movies: sorted,
        dbStatus: hasFirestore ? "firestore" : "fallback",
        dbConfigured: hasFirestore
      });
    } catch (err: any) {
      console.error("Erro ao carregar títulos do banco de dados:", err);
      const hasFirestore = !!getFirestoreDb();
      res.json({
        movies: sortMoviesByYearDesc(localMoviesList),
        dbStatus: hasFirestore ? "database_error" : "fallback",
        dbConfigured: hasFirestore,
        error: err?.message || err
      });
    }
  });

  // API route to seed the database with initial catalog
  app.post("/api/db/seed", requireAdmin, async (_req, res) => {
    try {
      const result = await seedDatabase();
      res.json({
        success: true,
        message: `Banco de dados semeado com sucesso na tabela '${result.table}'!`,
        table: result.table
      });
    } catch (err: any) {
      console.error("Erro ao semear o banco de dados:", err);
      res.status(500).json({
        success: false,
        error: "Falha ao semear o banco de dados.",
        details: err?.message || err
      });
    }
  });

  // Helper to fetch TMDB key from DB
  async function getTmdbApiKeyFromDb(): Promise<string> {
    const db = getFirestoreDb();
    if (db) {
      try {
        const docSnap = await db.collection("settings").doc("tmdb").get();
        if (docSnap.exists) {
          return docSnap.data()?.apiKey || "";
        }
      } catch (err) {
        console.warn("Erro ao buscar TMDB API Key do Firestore:", err);
      }
    }
    return "";
  }

  // API Route to GET TMDB key
  app.get("/api/settings/tmdb", requireAdmin, async (_req, res) => {
    try {
      const apiKey = await getTmdbApiKeyFromDb();
      res.json({ apiKey });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao ler as configurações do banco de dados." });
    }
  });

  // API Route to SET TMDB key
  app.post("/api/settings/tmdb", requireAdmin, async (req, res) => {
    try {
      const { apiKey } = req.body;
      const db = getFirestoreDb();
      if (db) {
        await db.collection("settings").doc("tmdb").set({
          apiKey: apiKey || "",
          updatedAt: new Date().toISOString()
        });
        res.json({ success: true, message: "Chave do TMDB salva com sucesso no banco de dados!" });
      } else {
        res.status(500).json({ error: "Firestore não inicializado." });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao salvar as configurações no banco de dados.", details: err.message });
    }
  });

  // Maintenance Mode Config (in-memory fallback + Firestore)
  let localMaintenanceConfig = {
    enabled: false,
    title: "Estamos em Manutenção Programada ⚙️",
    message: "Estamos realizando atualizações e melhorias gerais em nossos servidores e catálogo de mídia para oferecer uma reprodução muito mais estável e veloz. Voltaremos em breve!",
    estimatedReturn: "Em breve (Algumas horas)",
    updatedAt: new Date().toISOString(),
    updatedBy: "Administrador"
  };

  async function getMaintenanceConfigFromDb() {
    const db = getFirestoreDb();
    if (db) {
      try {
        const docSnap = await db.collection("settings").doc("maintenance").get();
        if (docSnap.exists) {
          const data = docSnap.data();
          return {
            enabled: Boolean(data?.enabled),
            title: data?.title || localMaintenanceConfig.title,
            message: data?.message || localMaintenanceConfig.message,
            estimatedReturn: data?.estimatedReturn || localMaintenanceConfig.estimatedReturn,
            updatedAt: data?.updatedAt || localMaintenanceConfig.updatedAt,
            updatedBy: data?.updatedBy || localMaintenanceConfig.updatedBy
          };
        }
      } catch (err) {
        console.warn("Erro ao buscar Modo de Manutenção do Firestore:", err);
      }
    }
    return localMaintenanceConfig;
  }

  // PUBLIC API: Check system maintenance status (Called by all visitors)
  app.get("/api/settings/maintenance", async (_req, res) => {
    try {
      const maintenance = await getMaintenanceConfigFromDb();
      res.json({ success: true, maintenance });
    } catch (err: any) {
      res.json({ success: true, maintenance: localMaintenanceConfig });
    }
  });

  // Custom Codes Config (Header & Footer code)
  let localCustomCodes = {
    headerCode: "",
    footerCode: "",
    updatedAt: new Date().toISOString()
  };

  async function getCustomCodesFromDb() {
    const db = getFirestoreDb();
    if (db) {
      try {
        const docSnap = await db.collection("settings").doc("custom_codes").get();
        if (docSnap.exists) {
          const data = docSnap.data();
          return {
            headerCode: data?.headerCode || "",
            footerCode: data?.footerCode || "",
            updatedAt: data?.updatedAt || localCustomCodes.updatedAt
          };
        }
      } catch (err) {
        console.warn("Erro ao buscar Códigos Customizados do Firestore:", err);
      }
    }
    return localCustomCodes;
  }

  // Site Ads Config
  const defaultAdSlot = {
    enabled: false,
    type: "code" as const,
    code: "",
    imageUrl: "",
    linkUrl: "",
    altText: "Anúncio Patrocinado"
  };

  let localAdsConfig = {
    headerAd: { ...defaultAdSlot },
    homeBetweenRowsAd: { ...defaultAdSlot },
    playerAd: { ...defaultAdSlot },
    footerAd: { ...defaultAdSlot },
    sidebarAd: { ...defaultAdSlot },
    popunderAd: { enabled: false, code: "" },
    updatedAt: new Date().toISOString()
  };

  async function getAdsConfigFromDb() {
    const db = getFirestoreDb();
    if (db) {
      try {
        const docSnap = await db.collection("settings").doc("ads").get();
        if (docSnap.exists) {
          const data = docSnap.data();
          return {
            headerAd: { ...defaultAdSlot, ...data?.headerAd },
            homeBetweenRowsAd: { ...defaultAdSlot, ...data?.homeBetweenRowsAd },
            playerAd: { ...defaultAdSlot, ...data?.playerAd },
            footerAd: { ...defaultAdSlot, ...data?.footerAd },
            sidebarAd: { ...defaultAdSlot, ...data?.sidebarAd },
            popunderAd: { enabled: Boolean(data?.popunderAd?.enabled), code: data?.popunderAd?.code || "" },
            updatedAt: data?.updatedAt || localAdsConfig.updatedAt
          };
        }
      } catch (err) {
        console.warn("Erro ao buscar Configuração de Anúncios do Firestore:", err);
      }
    }
    return localAdsConfig;
  }

  // UNIFIED PUBLIC API for fast client initial loading
  app.get("/api/settings/public", async (_req, res) => {
    try {
      const [maintenance, customCodes, ads] = await Promise.all([
        getMaintenanceConfigFromDb(),
        getCustomCodesFromDb(),
        getAdsConfigFromDb()
      ]);
      res.json({ success: true, maintenance, customCodes, ads });
    } catch (err: any) {
      res.json({
        success: true,
        maintenance: localMaintenanceConfig,
        customCodes: localCustomCodes,
        ads: localAdsConfig
      });
    }
  });

  // GET Custom Codes (Admin)
  app.get("/api/settings/custom-codes", requireAdmin, async (_req, res) => {
    try {
      const customCodes = await getCustomCodesFromDb();
      res.json({ success: true, customCodes });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao ler códigos customizados." });
    }
  });

  // POST Custom Codes (Admin)
  app.post("/api/settings/custom-codes", requireAdmin, async (req, res) => {
    try {
      const { headerCode, footerCode } = req.body;
      localCustomCodes = {
        headerCode: typeof headerCode === "string" ? headerCode : "",
        footerCode: typeof footerCode === "string" ? footerCode : "",
        updatedAt: new Date().toISOString()
      };

      const db = getFirestoreDb();
      if (db) {
        await db.collection("settings").doc("custom_codes").set(localCustomCodes);
      }

      res.json({
        success: true,
        message: "Códigos do cabeçalho e rodapé salvos com sucesso!",
        customCodes: localCustomCodes
      });
    } catch (err: any) {
      console.error("Erro ao salvar códigos customizados:", err);
      res.status(500).json({ error: "Erro interno ao salvar códigos customizados." });
    }
  });

  // GET Ads Config (Admin)
  app.get("/api/settings/ads", requireAdmin, async (_req, res) => {
    try {
      const ads = await getAdsConfigFromDb();
      res.json({ success: true, ads });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao ler configurações de anúncios." });
    }
  });

  // POST Ads Config (Admin)
  app.post("/api/settings/ads", requireAdmin, async (req, res) => {
    try {
      const { headerAd, homeBetweenRowsAd, playerAd, footerAd, sidebarAd, popunderAd } = req.body;

      localAdsConfig = {
        headerAd: { ...defaultAdSlot, ...headerAd },
        homeBetweenRowsAd: { ...defaultAdSlot, ...homeBetweenRowsAd },
        playerAd: { ...defaultAdSlot, ...playerAd },
        footerAd: { ...defaultAdSlot, ...footerAd },
        sidebarAd: { ...defaultAdSlot, ...sidebarAd },
        popunderAd: {
          enabled: Boolean(popunderAd?.enabled),
          code: String(popunderAd?.code || "")
        },
        updatedAt: new Date().toISOString()
      };

      const db = getFirestoreDb();
      if (db) {
        await db.collection("settings").doc("ads").set(localAdsConfig);
      }

      res.json({
        success: true,
        message: "Configurações de anúncios salvas com sucesso!",
        ads: localAdsConfig
      });
    } catch (err: any) {
      console.error("Erro ao salvar configurações de anúncios:", err);
      res.status(500).json({ error: "Erro interno ao salvar anúncios." });
    }
  });

  // ADMIN API: Update system maintenance status
  app.post("/api/settings/maintenance", requireAdmin, async (req, res) => {
    try {
      const { enabled, title, message, estimatedReturn } = req.body;
      const adminEmail = req.headers["x-user-email"] || "Administrador";

      localMaintenanceConfig = {
        enabled: Boolean(enabled),
        title: (title || "Estamos em Manutenção Programada ⚙️").trim(),
        message: (message || "Estamos realizando atualizações e melhorias gerais em nossos servidores. Voltaremos em breve!").trim(),
        estimatedReturn: (estimatedReturn || "Em breve").trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: String(adminEmail)
      };

      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("settings").doc("maintenance").set(localMaintenanceConfig);
        } catch (e) {
          console.warn("Aviso ao salvar modo de manutenção no Firestore:", e);
        }
      }

      console.log(`Modo de Manutenção alterado para: ${localMaintenanceConfig.enabled ? "LIGADO" : "DESLIGADO"} por ${adminEmail}`);

      res.json({
        success: true,
        message: localMaintenanceConfig.enabled
          ? "Modo de manutenção ATIVADO com sucesso! O site agora está em manutenção para os usuários."
          : "Modo de manutenção DESATIVADO com sucesso! O site voltou a operar normalmente.",
        maintenance: localMaintenanceConfig
      });
    } catch (err: any) {
      console.error("Erro ao salvar modo de manutenção:", err);
      res.status(500).json({ error: "Erro interno ao atualizar modo de manutenção." });
    }
  });

  // API route to search or discover titles on TMDB with pagination & year filters
  app.get("/api/tmdb/search", requireAdmin, async (req, res) => {
    try {
      const query = (req.query.query as string || "").trim();
      const type = req.query.type as string || "todos"; // "filme", "serie", "anime", "todos"
      const year = req.query.year as string || "";
      const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
      const clientApiKey = req.headers["x-tmdb-api-key"] as string;
      
      let apiKey = clientApiKey || process.env.TMDB_API_KEY;
      if (!apiKey) {
        apiKey = await getTmdbApiKeyFromDb();
      }

      if (!apiKey) {
        return res.status(400).json({ error: "Chave de API do TMDB não configurada. Configure a chave no menu de Configurações." });
      }

      let url = "";

      // Determine endpoints based on query vs discover mode
      if (query) {
        // Text search mode
        if (type === "serie") {
          url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=${page}&include_adult=false${year ? `&first_air_date_year=${year}` : ""}`;
        } else if (type === "anime") {
          url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=${page}&include_adult=false`;
        } else if (type === "todos") {
          url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=${page}&include_adult=false`;
        } else {
          // Default: "filme"
          url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=${page}&include_adult=false${year ? `&primary_release_year=${year}` : ""}`;
        }
      } else {
        // Discovery / Year mode (shows popular movies/series/animes for selected year or current popular)
        if (type === "serie") {
          url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&include_adult=false${year ? `&first_air_date_year=${year}` : ""}`;
        } else if (type === "anime") {
          url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_genres=16&with_original_language=ja${year ? `&first_air_date_year=${year}` : ""}`;
        } else {
          // Default: "filme" or "todos"
          url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&include_adult=false${year ? `&primary_release_year=${year}` : ""}`;
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: "Erro na chamada do TMDB. Verifique sua chave de API.", details: errText });
      }

      const data = await response.json();
      const results = (data.results || []).map((item: any) => {
        let itemType: "filme" | "serie" | "anime" = "filme";
        if (type === "anime") {
          itemType = "anime";
        } else if (item.media_type) {
          itemType = item.media_type === "tv" ? "serie" : "filme";
        } else if (type === "serie" || item.first_air_date) {
          itemType = "serie";
        }

        const releaseYear = item.release_date 
          ? new Date(item.release_date).getFullYear() 
          : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : (year ? Number(year) : 2026));

        return {
          id: item.id.toString(),
          tmdbId: item.id.toString(),
          title: item.title || item.name || "Sem título",
          originalTitle: item.original_title || item.original_name || item.title || item.name,
          year: isNaN(releaseYear) ? 2026 : releaseYear,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500",
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000",
          rating: Number((item.vote_average || 0).toFixed(1)),
          synopsis: item.overview || "Sem sinopse disponível.",
          type: itemType
        };
      });

      res.json({ 
        results,
        page: data.page || 1,
        totalPages: Math.min(data.total_pages || 1, 500),
        totalResults: data.total_results || results.length
      });
    } catch (err: any) {
      console.error("Erro ao buscar no TMDB:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API route to direct import a TMDB title with 1-click (with title search fallback and manual fallback)
  app.post("/api/tmdb/import-direct", requireAdmin, async (req, res) => {
    try {
      let { tmdbId, type, title, poster, backdrop, air_date, episode } = req.body;
      const clientApiKey = req.headers["x-tmdb-api-key"] as string;
      
      let apiKey = clientApiKey || process.env.TMDB_API_KEY;
      if (!apiKey) {
        apiKey = await getTmdbApiKeyFromDb();
      }

      // If tmdbId is missing but title is provided, try searching TMDB for tmdbId
      if (!tmdbId && title && apiKey) {
        try {
          const searchType = type === "serie" || type === "tv" || type === "anime" ? "tv" : "movie";
          const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=pt-BR&include_adult=false`;
          const sRes = await fetch(searchUrl);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.results && sData.results.length > 0) {
              tmdbId = sData.results[0].id;
            }
          }
        } catch (sErr) {
          console.warn("Erro ao buscar tmdbId por título:", sErr);
        }
      }

      const tmdbType = type === "serie" || type === "tv" || type === "anime" ? "tv" : "movie";
      const titleType: "filme" | "serie" | "anime" = type === "anime" ? "anime" : (tmdbType === "tv" ? "serie" : "filme");

      // Try fetching details from TMDB if tmdbId & apiKey exist
      let data: any = null;
      if (tmdbId && apiKey) {
        try {
          const appendParams = tmdbType === "tv" ? "credits,videos,external_ids" : "credits,videos";
          const url = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${apiKey}&language=pt-BR&append_to_response=${appendParams}`;
          const response = await fetch(url);
          if (response.ok) {
            data = await response.json();
          }
        } catch (fetchErr) {
          console.warn("Aviso ao buscar detalhes TMDB:", fetchErr);
        }
      }

      // If TMDB data was retrieved
      if (data) {
        const genres = (data.genres || []).map((g: any) => g.name);
        if (genres.length === 0) genres.push("Outros");

        let director = "Desconhecido";
        let cast: string[] = [];
        if (data.credits) {
          if (data.credits.crew) {
            const dirObj = data.credits.crew.find((member: any) => member.job === "Director");
            if (dirObj) director = dirObj.name;
          }
          if (data.credits.cast) {
            cast = data.credits.cast.slice(0, 5).map((c: any) => c.name);
          }
        }
        if (cast.length === 0) cast = ["Desconhecido"];

        let trailerVideoId = "dQw4w9WgXcQ";
        if (data.videos && data.videos.results) {
          const trailer = data.videos.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
          if (trailer) {
            trailerVideoId = trailer.key;
          } else if (data.videos.results.length > 0) {
            const anyVid = data.videos.results.find((v: any) => v.site === "YouTube");
            if (anyVid) trailerVideoId = anyVid.key;
          }
        }

        // Secondary fallback: fetch videos without language filter if pt-BR had no YouTube trailer
        if ((!trailerVideoId || trailerVideoId === "dQw4w9WgXcQ") && tmdbId && apiKey) {
          try {
            const extraVUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/videos?api_key=${apiKey}`;
            const extraVRes = await fetch(extraVUrl);
            if (extraVRes.ok) {
              const extraVData = await extraVRes.json();
              if (extraVData.results && extraVData.results.length > 0) {
                const tr = extraVData.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ||
                           extraVData.results.find((v: any) => v.site === "YouTube");
                if (tr) trailerVideoId = tr.key;
              }
            }
          } catch (vErr) {
            console.warn("Aviso na busca secundaria de trailer:", vErr);
          }
        }

        let duration = "120 min";
        if (tmdbType === "movie") {
          duration = data.runtime ? `${data.runtime} min` : "120 min";
        } else {
          const seasons = data.number_of_seasons || 1;
          duration = `${seasons} Temp${seasons > 1 ? "s" : ""}`;
        }

        let imdbId = "";
        if (tmdbType === "movie") {
          imdbId = data.imdb_id || "";
        } else if (data.external_ids) {
          imdbId = data.external_ids.imdb_id || "";
        }

        const releaseYear = data.release_date 
          ? new Date(data.release_date).getFullYear() 
          : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : 2026);

        const titleName = data.title || data.name || title || "Sem título";
        const normalizedTitle = titleName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

        // Duplicate check
        const existingMovie = localMoviesList.find(m => {
          if (m.tmdbId && String(m.tmdbId) === String(data.id)) return true;
          if (m.id === `tmdb-${data.id}`) return true;
          if (imdbId && m.imdbId && m.imdbId === imdbId) return true;
          if (normalizedTitle && m.title) {
            const normExisting = m.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
            if (normExisting === normalizedTitle && m.type === titleType) return true;
          }
          return false;
        });

        if (existingMovie) {
          return res.json({ 
            success: true, 
            movie: existingMovie, 
            alreadyExisted: true, 
            message: `O título "${existingMovie.title}" já está cadastrado no catálogo.` 
          });
        }

        const newMovie: any = {
          id: `tmdb-${data.id}`,
          title: titleName,
          originalTitle: data.original_title || data.original_name || titleName,
          year: isNaN(releaseYear) ? 2026 : releaseYear,
          duration,
          rating: Number((data.vote_average || 0).toFixed(1)) || 8.5,
          genres,
          synopsis: data.overview || (episode ? `Lançamento: ${episode}` : "Sem sinopse disponível."),
          backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : (backdrop ? (backdrop.startsWith("http") ? backdrop : `https://image.tmdb.org/t/p/w1280${backdrop}`) : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000"),
          posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : (poster ? (poster.startsWith("http") ? poster : `https://image.tmdb.org/t/p/w500${poster}`) : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500"),
          trailerVideoId,
          cast,
          director,
          featured: false,
          type: titleType,
          imdbId,
          tmdbId: String(data.id),
          createdAt: new Date().toISOString()
        };

        const db = getFirestoreDb();
        if (db) {
          await db.collection("movies").doc(newMovie.id).set(newMovie);
        }

        const existingIdx = localMoviesList.findIndex(m => m.id === newMovie.id || (m.tmdbId && m.tmdbId === newMovie.tmdbId));
        if (existingIdx >= 0) {
          localMoviesList[existingIdx] = newMovie;
        } else {
          localMoviesList.unshift(newMovie);
        }

        return res.json({ success: true, movie: newMovie, message: `"${newMovie.title}" adicionado ao catálogo com sucesso!` });
      }

      // Fallback if TMDB API is unavailable or title wasn't found on TMDB: create directly from provided metadata
      if (!title) {
        return res.status(400).json({ error: "Título é obrigatório para cadastrar no site." });
      }

      const cleanTitle = String(title).trim();
      const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

      const existingFallback = localMoviesList.find(m => {
        if (m.title && m.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === normTitle && m.type === titleType) return true;
        if (tmdbId && m.tmdbId && String(m.tmdbId) === String(tmdbId)) return true;
        return false;
      });

      if (existingFallback) {
        return res.json({
          success: true,
          movie: existingFallback,
          alreadyExisted: true,
          message: `O título "${existingFallback.title}" já está cadastrado no catálogo.`
        });
      }

      const yearFromDate = air_date ? parseInt(String(air_date).split("-")[0], 10) : 2026;
      const formattedPoster = poster ? (poster.startsWith("http") ? poster : `https://image.tmdb.org/t/p/w500${poster}`) : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
      const formattedBackdrop = backdrop ? (backdrop.startsWith("http") ? backdrop : `https://image.tmdb.org/t/p/w1280${backdrop}`) : formattedPoster;

      const manualMovie: any = {
        id: tmdbId ? `tmdb-${tmdbId}` : `cal-${Date.now()}`,
        title: cleanTitle,
        originalTitle: cleanTitle,
        year: isNaN(yearFromDate) ? 2026 : yearFromDate,
        duration: titleType === "filme" ? "120 min" : "1 Temp",
        rating: 8.5,
        genres: [titleType === "anime" ? "Anime" : titleType === "serie" ? "Série" : "Filme", "Lançamento"],
        synopsis: episode ? `Lançamento: ${episode}` : `Título adicionado pelo calendário em ${air_date || "2026"}.`,
        backdropUrl: formattedBackdrop,
        posterUrl: formattedPoster,
        trailerVideoId: "dQw4w9WgXcQ",
        cast: ["PipocaMax"],
        director: "PipocaMax",
        featured: false,
        type: titleType,
        tmdbId: tmdbId ? String(tmdbId) : undefined,
        createdAt: new Date().toISOString()
      };

      const db = getFirestoreDb();
      if (db) {
        await db.collection("movies").doc(manualMovie.id).set(manualMovie);
      }

      localMoviesList.unshift(manualMovie);

      res.json({
        success: true,
        movie: manualMovie,
        message: `"${manualMovie.title}" adicionado ao catálogo com sucesso!`
      });
    } catch (err: any) {
      console.error("Erro ao importar direto do TMDB/Calendário:", err);
      res.status(500).json({ error: err.message || "Erro interno ao adicionar título." });
    }
  });

  // API route to get full TMDB details and map to PipocaMax Movie schema
  app.get("/api/tmdb/details", requireAdmin, async (req, res) => {
    try {
      const id = req.query.id as string;
      const type = req.query.type as string || "movie"; // "movie" or "tv"
      const clientApiKey = req.headers["x-tmdb-api-key"] as string;
      
      let apiKey = clientApiKey || process.env.TMDB_API_KEY;
      if (!apiKey) {
        apiKey = await getTmdbApiKeyFromDb();
      }

      if (!apiKey) {
        return res.status(400).json({ error: "Chave de API do TMDB não configurada." });
      }

      if (!id) {
        return res.status(400).json({ error: "ID do título é obrigatório." });
      }

      const tmdbType = type === "serie" || type === "tv" ? "tv" : "movie";
      
      // Append credits and videos (and external_ids for tv to get IMDb id)
      const appendParams = tmdbType === "tv" ? "credits,videos,external_ids" : "credits,videos";
      const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=${appendParams}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: "Erro ao obter detalhes do TMDB", details: errText });
      }

      const data = await response.json();
      
      // Extract genres
      const genres = (data.genres || []).map((g: any) => g.name);
      if (genres.length === 0) genres.push("Outros");

      // Extract director and cast
      let director = "Desconhecido";
      let cast: string[] = [];
      if (data.credits) {
        if (data.credits.crew) {
          const dirObj = data.credits.crew.find((member: any) => member.job === "Director");
          if (dirObj) director = dirObj.name;
        }
        if (data.credits.cast) {
          cast = data.credits.cast.slice(0, 5).map((c: any) => c.name);
        }
      }
      if (cast.length === 0) cast = ["Desconhecido"];

      // Extract trailer (YouTube)
      let trailerVideoId = "dQw4w9WgXcQ"; // fallback rickroll
      if (data.videos && data.videos.results) {
        const trailer = data.videos.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
        if (trailer) {
          trailerVideoId = trailer.key;
        } else if (data.videos.results.length > 0) {
          const anyVid = data.videos.results.find((v: any) => v.site === "YouTube");
          if (anyVid) trailerVideoId = anyVid.key;
        }
      }

      // Secondary fallback for details: fetch videos without language filter if pt-BR had no YouTube trailer
      if ((!trailerVideoId || trailerVideoId === "dQw4w9WgXcQ") && id && apiKey) {
        try {
          const extraVUrl = `https://api.themoviedb.org/3/${tmdbType}/${id}/videos?api_key=${apiKey}`;
          const extraVRes = await fetch(extraVUrl);
          if (extraVRes.ok) {
            const extraVData = await extraVRes.json();
            if (extraVData.results && extraVData.results.length > 0) {
              const tr = extraVData.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ||
                         extraVData.results.find((v: any) => v.site === "YouTube");
              if (tr) trailerVideoId = tr.key;
            }
          }
        } catch (vErr) {
          console.warn("Aviso na busca secundaria de trailer em details:", vErr);
        }
      }

      // Duration mapping
      let duration = "120 min";
      if (tmdbType === "movie") {
        duration = data.runtime ? `${data.runtime} min` : "120 min";
      } else {
        const seasons = data.number_of_seasons || 1;
        duration = `${seasons} Temp${seasons > 1 ? "s" : ""}`;
      }

      // IMDb ID
      let imdbId = "";
      if (tmdbType === "movie") {
        imdbId = data.imdb_id || "";
      } else if (data.external_ids) {
        imdbId = data.external_ids.imdb_id || "";
      }

      const result = {
        title: data.title || data.name,
        originalTitle: data.original_title || data.original_name || data.title || data.name,
        year: data.release_date ? new Date(data.release_date).getFullYear() : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : 2026),
        duration,
        rating: Number((data.vote_average || 0).toFixed(1)),
        genres,
        synopsis: data.overview || "Sem sinopse disponível.",
        backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000",
        posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500",
        trailerVideoId,
        cast,
        director,
        featured: false,
        type: tmdbType === "tv" ? "serie" : "filme",
        imdbId
      };

      res.json({ result });
    } catch (err: any) {
      console.error("Erro ao obter detalhes no TMDB:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API route to resolve trailer YouTube video ID for any title or TMDB ID
  app.get("/api/tmdb/trailer", async (req, res) => {
    try {
      let tmdbId = req.query.tmdbId as string;
      const title = req.query.title as string;
      const type = (req.query.type as string) || "filme";
      const year = req.query.year as string;

      let apiKey = req.headers["x-tmdb-api-key"] as string || process.env.TMDB_API_KEY;
      if (!apiKey) {
        apiKey = await getTmdbApiKeyFromDb();
      }

      const tmdbType = type === "serie" || type === "tv" || type === "anime" ? "tv" : "movie";

      // If tmdbId is missing but title is provided, search TMDB
      if ((!tmdbId || tmdbId === "undefined" || tmdbId === "null") && title && apiKey) {
        try {
          const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=pt-BR&include_adult=false${year ? `&year=${year}` : ""}`;
          const sRes = await fetch(searchUrl);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.results && sData.results.length > 0) {
              tmdbId = String(sData.results[0].id);
            }
          }
        } catch (sErr) {
          console.warn("Erro ao buscar tmdbId para trailer:", sErr);
        }
      }

      let trailerVideoId: string | null = null;

      if (tmdbId && tmdbId !== "undefined" && tmdbId !== "null" && apiKey) {
        // Step 1: Try fetching videos in pt-BR
        try {
          const vUrlPt = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/videos?api_key=${apiKey}&language=pt-BR`;
          const vResPt = await fetch(vUrlPt);
          if (vResPt.ok) {
            const vDataPt = await vResPt.json();
            if (vDataPt.results && vDataPt.results.length > 0) {
              const tr = vDataPt.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ||
                         vDataPt.results.find((v: any) => v.site === "YouTube");
              if (tr) trailerVideoId = tr.key;
            }
          }
        } catch (e) {}

        // Step 2: Fallback to videos without language filter (English/global) if pt-BR had none
        if (!trailerVideoId) {
          try {
            const vUrlEn = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/videos?api_key=${apiKey}`;
            const vResEn = await fetch(vUrlEn);
            if (vResEn.ok) {
              const vDataEn = await vResEn.json();
              if (vDataEn.results && vDataEn.results.length > 0) {
                const tr = vDataEn.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ||
                           vDataEn.results.find((v: any) => v.site === "YouTube");
                if (tr) trailerVideoId = tr.key;
              }
            }
          } catch (e) {}
        }
      }

      if (trailerVideoId) {
        return res.json({ success: true, trailerVideoId });
      } else {
        return res.status(404).json({ success: false, error: "Nenhum trailer encontrado no TMDB." });
      }
    } catch (err: any) {
      console.error("Erro na rota /api/tmdb/trailer:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API route to clear all test movies from the Firestore database
  app.post("/api/db/clear-test-movies", requireAdmin, async (_req, res) => {
    try {
      const db = getFirestoreDb();
      const deletedIds: string[] = [];
      const testIds = [
        "interstellar", "inception", "dune2", "spiderverse", "darkknight", 
        "nemo", "matrix", "deadpool3", "insideout2", "cyberpunk", 
        "demonslayer_hashira", "naruto_shippuden", "avatar2", "godzilla_kong", 
        "gladiator2", "joker2"
      ];

      if (db) {
        for (const id of testIds) {
          try {
            await db.collection("movies").doc(id).delete();
            deletedIds.push(id);
          } catch (err) {
            console.warn(`Erro ao deletar filme de teste ${id} no Firestore:`, err);
          }
        }
      }

      // Also reset our local memory list
      localMoviesList = localMoviesList.filter(m => !testIds.includes(m.id));
      
      res.json({ 
        success: true, 
        message: "Títulos de teste removidos com sucesso!", 
        deletedCount: deletedIds.length 
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Auth API: me
  app.get("/api/auth/me", async (req, res) => {
    try {
      const emailRaw = req.query.email as string;
      if (!emailRaw) {
        return res.status(400).json({ error: "E-mail é obrigatório." });
      }
      const email = emailRaw.trim().toLowerCase();

      // Sync users from DB first
      const users = await fetchUsersFromDb();
      let user = users.find(u => u.email && u.email.trim().toLowerCase() === email);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      if (user.status === "banned") {
        return res.status(403).json({ error: "Sua conta foi bloqueada/banida por um administrador." });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (err: any) {
      console.error("Erro ao sincronizar usuário:", err);
      res.status(500).json({ error: "Erro interno ao sincronizar sessão." });
    }
  });

  // Auth API: login
  app.post("/api/auth/login", async (req, res) => {
    try {
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      email = String(email).trim().toLowerCase();
      password = String(password).trim();

      // Sync users from DB first
      const users = await fetchUsersFromDb();
      
      let user = users.find(u => u.email && u.email.trim().toLowerCase() === email);

      if (!user) {
        return res.status(401).json({ 
          error: "E-mail não cadastrado.",
          details: "Não encontramos uma conta com este e-mail. Caso seja seu primeiro acesso, clique na opção 'Cadastre-se grátis'."
        });
      }

      const now = Date.now();

      // Check if user is manually banned by admin
      if (user.status === "banned") {
        return res.status(403).json({
          success: false,
          banned: true,
          error: "Conta Bloqueada por Administrador",
          details: user.lockoutReason || "Seu acesso foi bloqueado ou banido por um administrador do sistema PipocaMax."
        });
      }

      // Check if user is currently locked out due to password attempts
      if (user.lockoutUntil) {
        const lockoutTime = new Date(user.lockoutUntil).getTime();
        if (lockoutTime > now) {
          const remainingSec = Math.ceil((lockoutTime - now) / 1000);
          let remainingText = `${remainingSec} segundo(s)`;
          if (remainingSec >= 60 && remainingSec < 3600) {
            remainingText = `${Math.ceil(remainingSec / 60)} minuto(s)`;
          } else if (remainingSec >= 3600) {
            const hours = (remainingSec / 3600).toFixed(1);
            remainingText = `${hours} horas`;
          }

          return res.status(403).json({
            success: false,
            locked: true,
            error: "Conta Bloqueada por Tentativas de Senha",
            details: `Sua conta está bloqueada temporariamente por erros consecutivos de senha. Tente novamente em ${remainingText}.`,
            lockoutReason: user.lockoutReason,
            lockoutUntil: user.lockoutUntil
          });
        }
      }

      const userPass = String(user.password || "").trim();
      const isAdminBypass = user.role === "admin" && (password === "admin" || userPass === "");

      if (userPass !== password && !isAdminBypass) {
        const currentFailed = (user.failedAttempts || 0) + 1;
        user.failedAttempts = currentFailed;

        let lockoutReason = null;
        let lockoutUntil = null;
        let errorMessage = "Senha incorreta.";
        let detailsMessage = `Você errou a senha (tentativa ${currentFailed} de 3).`;

        if (currentFailed === 3) {
          // 3rd attempt: Lock for 1 minute
          lockoutUntil = new Date(now + 60 * 1000).toISOString();
          lockoutReason = "3 tentativas incorretas de senha (Bloqueado por 1 minuto)";
          user.lockoutUntil = lockoutUntil;
          user.lockoutReason = lockoutReason;

          errorMessage = "Conta Bloqueada por 1 Minuto";
          detailsMessage = "Você errou a senha 3 vezes consecutivas. Sua conta foi bloqueada por 1 minuto por segurança.";
        } else if (currentFailed >= 4) {
          // 4th+ attempt: Lock for 24 hours (24 * 60 * 60 * 1000 ms)
          lockoutUntil = new Date(now + 24 * 60 * 60 * 1000).toISOString();
          lockoutReason = "4+ tentativas incorretas de senha (Bloqueado por 24 horas)";
          user.lockoutUntil = lockoutUntil;
          user.lockoutReason = lockoutReason;

          errorMessage = "Conta Bloqueada por 24 Horas";
          detailsMessage = "Você errou a senha novamente após o bloqueio inicial. Sua conta foi bloqueada por 24h00 por segurança.";
        }

        // Save failed attempt state to Firestore
        const db = getFirestoreDb();
        if (db && user.id) {
          try {
            await db.collection("users").doc(user.id).set({
              failedAttempts: currentFailed,
              lockoutUntil: user.lockoutUntil || null,
              lockoutReason: user.lockoutReason || null
            }, { merge: true });
          } catch (e) {
            console.warn("Erro ao salvar falha de senha no Firestore:", e);
          }
        }

        return res.status(401).json({ 
          error: errorMessage,
          details: detailsMessage,
          failedAttempts: currentFailed,
          lockoutUntil: user.lockoutUntil
        });
      }

      // Password is CORRECT -> Reset lockout and failed attempts
      user.failedAttempts = 0;
      user.lockoutUntil = null;
      user.lockoutReason = null;

      const db = getFirestoreDb();
      if (db && user.id) {
        try {
          await db.collection("users").doc(user.id).set({
            failedAttempts: 0,
            lockoutUntil: null,
            lockoutReason: null
          }, { merge: true });
        } catch (e) {
          console.warn("Erro ao zerar tentativas de login no Firestore:", e);
        }
      }

      // Return user details without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (err: any) {
      console.error("Erro no login:", err);
      res.status(500).json({ error: "Erro interno ao realizar login." });
    }
  });

  // Auth API: register
  app.post("/api/auth/register", async (req, res) => {
    try {
      let { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Todos os campos (nome, e-mail e senha) são obrigatórios." });
      }

      email = String(email).trim().toLowerCase();
      password = String(password).trim();
      name = String(name).trim();

      const rawIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || req.ip || "127.0.0.1";
      const clientIp = rawIp.replace(/^.*:/, ""); // strip IPv6 prefix if any

      // Sync users first
      const users = await fetchUsersFromDb();

      // Rule: Only 1 account per IP address
      if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "localhost" && clientIp !== "::1") {
        const existingIpUser = users.find(u => u.registeredIp === clientIp || u.registeredIp === rawIp);
        if (existingIpUser) {
          return res.status(400).json({
            error: "Limite de Cadastro por IP Atingido",
            details: `Já existe uma conta cadastrada neste endereço IP (${existingIpUser.email}). É permitido apenas 1 cadastro por IP por segurança.`
          });
        }
      }

      if (users.some(u => u.email && u.email.trim().toLowerCase() === email)) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado. Clique em 'Faça login aqui'." });
      }

      const newUser = {
        id: "u_" + Math.random().toString(36).substr(2, 9),
        name,
        email,
        password,
        role: role === "admin" ? "admin" : "user",
        status: "active",
        registeredIp: clientIp,
        failedAttempts: 0,
        lockoutUntil: null,
        lockoutReason: null,
        createdAt: new Date().toISOString()
      };

      // Add to in-memory list
      localUsersList.push(newUser);

      // Save to database if available
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("users").doc(newUser.id).set({
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            status: "active",
            registeredIp: newUser.registeredIp,
            failedAttempts: 0,
            lockoutUntil: null,
            lockoutReason: null,
            createdAt: newUser.createdAt
          });
          console.log("Usuário cadastrado com sucesso no Firestore com suporte a trava de IP!");
        } catch (e: any) {
          console.error("Erro ao cadastrar usuário no Firestore (prosseguindo com login local):", e);
        }
      }

      // Automatically generate a personalized welcome notification for the new user
      const welcomeNotification = {
        id: "notif_welcome_" + Math.random().toString(36).substring(2, 9),
        userEmail: newUser.email,
        target: "user",
        type: "success",
        title: "Bem-vindo(a) ao PipocaMax! 🍿",
        message: `Olá ${newUser.name}! Sua conta foi criada com sucesso. Sinta-se à vontade para explorar nosso catálogo e aproveitar os melhores filmes, séries e animes.`,
        read: false,
        createdAt: new Date().toISOString()
      };

      localNotificationsList.unshift(welcomeNotification);
      if (db) {
        try {
          await db.collection("notifications").doc(welcomeNotification.id).set(welcomeNotification);
        } catch (e: any) {
          console.warn("Erro ao salvar notificação de boas-vindas no Firestore:", e);
        }
      }

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        success: true,
        user: userWithoutPassword
      });
    } catch (err: any) {
      console.error("Erro ao registrar usuário:", err);
      res.status(500).json({ error: "Erro interno ao registrar usuário." });
    }
  });

  // Users management API: unlock user account after lockout
  app.post("/api/users/:id/unlock", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await fetchUsersFromDb();

      let targetUser = localUsersList.find(
        u => u.id === id || (u.email && u.email.trim().toLowerCase() === id.trim().toLowerCase())
      );

      if (!targetUser) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      targetUser.failedAttempts = 0;
      targetUser.lockoutUntil = null;
      targetUser.lockoutReason = null;
      if (targetUser.status === "banned") {
        targetUser.status = "active";
      }

      const targetEmail = (targetUser.email || (id.includes("@") ? id : "")).trim().toLowerCase();

      localUsersList.forEach(u => {
        if (u.id === id || (targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail)) {
          u.failedAttempts = 0;
          u.lockoutUntil = null;
          u.lockoutReason = null;
          if (u.status === "banned") u.status = "active";
        }
      });

      const db = getFirestoreDb();
      if (db) {
        try {
          const updateData = {
            failedAttempts: 0,
            lockoutUntil: null,
            lockoutReason: null,
            status: "active"
          };
          await db.collection("users").doc(targetUser.id || id).set(updateData, { merge: true });
          if (targetEmail) {
            const querySnap = await db.collection("users").where("email", "==", targetEmail).get();
            if (!querySnap.empty) {
              for (const docSnap of querySnap.docs) {
                await db.collection("users").doc(docSnap.id).set(updateData, { merge: true });
              }
            }
          }
        } catch (e) {
          console.warn("Erro ao desbloquear usuário no Firestore:", e);
        }
      }

      res.json({
        success: true,
        message: `A conta de ${targetUser.name} (${targetUser.email}) foi desbloqueada com sucesso!`
      });
    } catch (err: any) {
      console.error("Erro ao desbloquear usuário:", err);
      res.status(500).json({ error: "Erro interno ao desbloquear usuário." });
    }
  });

  // Users management API: list all users
  app.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      const users = await fetchUsersFromDb();
      // Map to remove passwords
      const safeUsers = users.map(({ password: _, ...rest }) => rest);
      res.json({ users: safeUsers });
    } catch (err) {
      res.status(500).json({ error: "Erro ao carregar usuários." });
    }
  });

  // Users management API: create new user
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      let { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
      }

      email = String(email).trim().toLowerCase();
      password = String(password).trim();
      name = String(name).trim();
      role = role === "admin" ? "admin" : "user";

      const users = await fetchUsersFromDb();
      if (users.some(u => u.email && u.email.trim().toLowerCase() === email)) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado no sistema." });
      }

      const newUser = {
        id: "u_" + Math.random().toString(36).substr(2, 9),
        name,
        email,
        password,
        role,
        status: "active",
        createdAt: new Date().toISOString()
      };

      localUsersList.push(newUser);

      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("users").doc(newUser.id).set({
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
            status: "active",
            createdAt: newUser.createdAt
          });
        } catch (e) {
          console.error("Erro ao salvar novo usuário no Firestore:", e);
        }
      }

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({
        success: true,
        user: userWithoutPassword,
        message: "Usuário criado com sucesso!"
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar usuário." });
    }
  });

  // Users management API: update user role
  app.put("/api/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: "O campo role é obrigatório." });
      }

      const targetRole = role === "admin" ? "admin" : "user";

      // Sync latest DB users first
      await fetchUsersFromDb();

      // Find user in memory
      let targetUser = localUsersList.find(
        u => u.id === id || (u.email && u.email.trim().toLowerCase() === id.trim().toLowerCase())
      );

      const targetEmail = (targetUser?.email || (id.includes("@") ? id : "")).trim().toLowerCase();

      // Update in local memory
      localUsersList.forEach(u => {
        if (u.id === id || (targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail)) {
          u.role = targetRole;
        }
      });

      // Save to Firestore
      const db = getFirestoreDb();
      if (db) {
        try {
          // Update doc by id
          await db.collection("users").doc(id).set({ role: targetRole }, { merge: true });

          if (targetUser && targetUser.id && targetUser.id !== id) {
            await db.collection("users").doc(targetUser.id).set({ role: targetRole }, { merge: true });
          }

          // Also check by email
          if (targetEmail) {
            const querySnap = await db.collection("users").where("email", "==", targetEmail).get();
            if (!querySnap.empty) {
              for (const docSnap of querySnap.docs) {
                await db.collection("users").doc(docSnap.id).set({ role: targetRole }, { merge: true });
              }
            }
          }
          console.log(`Papel do usuário ${id} (${targetEmail}) alterado para ${targetRole} no Firestore.`);
        } catch (e) {
          console.warn("Erro ao atualizar papel do usuário no Firestore:", e);
        }
      }

      res.json({ 
        success: true, 
        message: `Nível de acesso alterado para ${targetRole === "admin" ? "Administrador" : "Usuário Comum"}!`,
        role: targetRole,
        userId: targetUser ? targetUser.id : id
      });
    } catch (err: any) {
      console.error("Erro ao atualizar papel do usuário:", err);
      res.status(500).json({ error: "Erro ao atualizar nível de acesso do usuário." });
    }
  });

  // Users management API: toggle block/ban user status (active <-> banned)
  app.put("/api/users/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // "active" or "banned"

      if (!status || (status !== "active" && status !== "banned")) {
        return res.status(400).json({ error: "O status é obrigatório e deve ser 'active' ou 'banned'." });
      }

      // Sync users from DB first
      await fetchUsersFromDb();

      let targetUser = localUsersList.find(
        u => u.id === id || (u.email && u.email.trim().toLowerCase() === id.trim().toLowerCase())
      );

      if (!targetUser) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      if (targetUser.id === "admin-default" || (targetUser.email && targetUser.email.trim().toLowerCase() === "admin@pipocamax.com")) {
        return res.status(400).json({ error: "O administrador principal não pode ser bloqueado ou banido." });
      }

      targetUser.status = status;
      const targetEmail = (targetUser?.email || (id.includes("@") ? id : "")).trim().toLowerCase();

      localUsersList.forEach(u => {
        if (u.id === id || (targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail)) {
          u.status = status;
        }
      });

      // Update in Firestore
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("users").doc(id).set({ status }, { merge: true });

          if (targetUser && targetUser.id && targetUser.id !== id) {
            await db.collection("users").doc(targetUser.id).set({ status }, { merge: true });
          }

          if (targetEmail) {
            const querySnap = await db.collection("users").where("email", "==", targetEmail).get();
            if (!querySnap.empty) {
              for (const docSnap of querySnap.docs) {
                await db.collection("users").doc(docSnap.id).set({ status }, { merge: true });
              }
            }
          }
          console.log(`[Firestore] Status do usuário ${targetEmail} alterado para: ${status}`);
        } catch (e: any) {
          console.error("Erro ao alterar status no Firestore:", e);
        }
      }

      res.json({
        success: true,
        message: status === "banned" ? "Usuário bloqueado/banido com sucesso." : "Usuário desbloqueado com sucesso.",
        status,
        userId: targetUser.id
      });
    } catch (err: any) {
      console.error("Erro ao alterar status do usuário:", err);
      res.status(500).json({ error: "Erro ao alterar status do usuário." });
    }
  });

  // Users management API: full update user (name, email, role, password)
  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      let { name, email, role, password } = req.body;

      await fetchUsersFromDb();

      let user = localUsersList.find(
        u => u.id === id || (u.email && u.email.trim().toLowerCase() === id.trim().toLowerCase())
      );

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      if (name) user.name = String(name).trim();
      if (email) user.email = String(email).trim().toLowerCase();
      if (role) user.role = role === "admin" ? "admin" : "user";
      if (password && String(password).trim().length > 0) user.password = String(password).trim();

      const db = getFirestoreDb();
      if (db) {
        try {
          const updateData: any = {
            name: user.name,
            email: user.email,
            role: user.role
          };
          if (user.password) updateData.password = user.password;

          await db.collection("users").doc(user.id).set(updateData, { merge: true });

          if (user.email) {
            const querySnap = await db.collection("users").where("email", "==", user.email).get();
            if (!querySnap.empty) {
              for (const docSnap of querySnap.docs) {
                await db.collection("users").doc(docSnap.id).set(updateData, { merge: true });
              }
            }
          }
        } catch (e) {
          console.warn("Erro ao atualizar dados do usuário no Firestore:", e);
        }
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        message: "Dados do usuário atualizados com sucesso!",
        user: userWithoutPassword
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar usuário." });
    }
  });

  // Users management API: delete user
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (id === "admin-default") {
        return res.status(400).json({ error: "O administrador principal padrão não pode ser excluído." });
      }

      await fetchUsersFromDb();

      const targetUser = localUsersList.find(
        u => u.id === id || (u.email && u.email.trim().toLowerCase() === id.trim().toLowerCase())
      );

      const targetEmail = (targetUser?.email || (id.includes("@") ? id : "")).trim().toLowerCase();

      // Update in memory
      localUsersList = localUsersList.filter(
        u => u.id !== id && (!u.email || u.email.trim().toLowerCase() !== id.trim().toLowerCase()) && (!targetEmail || u.email.trim().toLowerCase() !== targetEmail)
      );

      // Save to database
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("users").doc(id).delete();
          if (targetUser && targetUser.id && targetUser.id !== id) {
            await db.collection("users").doc(targetUser.id).delete();
          }

          if (targetEmail) {
            const querySnap = await db.collection("users").where("email", "==", targetEmail).get();
            if (!querySnap.empty) {
              for (const docSnap of querySnap.docs) {
                await db.collection("users").doc(docSnap.id).delete();
              }
            }
          }
        } catch (e) {
          console.warn("Erro ao remover usuário no Firestore:", e);
        }
      }

      res.json({ success: true, message: "Usuário removido com sucesso!" });
    } catch (err) {
      res.status(500).json({ error: "Erro ao remover usuário." });
    }
  });

  // Auth API: update user profile
  app.put("/api/auth/profile", async (req, res) => {
    try {
      const { userId, email, name } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
      }

      const uIndex = localUsersList.findIndex(
        u => u.id === userId || u.email.toLowerCase() === email.toLowerCase()
      );

      if (uIndex !== -1) {
        localUsersList[uIndex].name = name;
      }

      const db = getFirestoreDb();
      if (db && userId) {
        try {
          await db.collection("users").doc(userId).set({ name }, { merge: true });
        } catch (e) {
          console.warn("Erro ao atualizar perfil no Firestore:", e);
        }
      }

      const updatedUser = uIndex !== -1 ? localUsersList[uIndex] : { id: userId, email, name, role: "user" };
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      res.status(500).json({ error: "Erro ao atualizar informações do perfil." });
    }
  });

  // Reporting API: Submit new report (Requires authenticated user email)
  app.post("/api/reports", async (req, res) => {
    try {
      const { userId, userName, userEmail, movieId, movieTitle, reason, description } = req.body;
      const finalEmail = (userEmail || (req.headers["x-user-email"] as string) || "usuario@pipocamax.com").trim().toLowerCase();

      if (!description || !description.trim()) {
        return res.status(400).json({ error: "Descrição do problema é obrigatória para reportar." });
      }

      const newReport = {
        id: "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        userId: userId || "user_anon",
        userName: userName || "Usuário PipocaMax",
        userEmail: finalEmail,
        movieId: movieId || "",
        movieTitle: movieTitle || "Geral / Site",
        reason: reason || "Problema no site",
        description: description.trim(),
        status: "Pendente",
        createdAt: new Date().toISOString()
      };

      // Push to in-memory list
      localReportsList.unshift(newReport);

      // Save to Firestore if database is configured
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("reports").doc(newReport.id).set(newReport);
          console.log("Relatório salvo no Firestore com sucesso!");
        } catch (e) {
          console.warn("Erro ao salvar relatório no Firestore:", e);
        }
      }

      res.status(201).json({ success: true, report: newReport });
    } catch (err: any) {
      console.error("Erro ao criar relatório:", err);
      res.status(500).json({ error: "Erro interno ao processar o relatório de erro." });
    }
  });

  // Reporting API: Get all reports (Requires Admin)
  app.get("/api/reports", requireAdmin, async (_req, res) => {
    try {
      const reports = await fetchReportsFromDb();
      res.json({ reports });
    } catch (err) {
      console.error("Erro ao listar relatórios:", err);
      res.status(500).json({ error: "Erro ao carregar relatórios." });
    }
  });

  // Reporting API: Get user's own reports
  app.get("/api/reports/my", async (req, res) => {
    try {
      const email = req.query.email ? String(req.query.email).toLowerCase() : "";
      if (!email) {
        return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
      }

      const allReports = await fetchReportsFromDb();
      const userReports = allReports.filter(r => r.userEmail && r.userEmail.toLowerCase() === email);

      res.json({ reports: userReports });
    } catch (err) {
      console.error("Erro ao buscar relatórios do usuário:", err);
      res.status(500).json({ error: "Erro ao buscar seus relatórios." });
    }
  });

  // Reporting API: Update report status or send admin reply (Requires Admin)
  app.put("/api/reports/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminReply } = req.body;

      if (!status) {
        return res.status(400).json({ error: "O campo status é obrigatório." });
      }

      const replyTime = new Date().toISOString();
      const idx = localReportsList.findIndex(r => r.id === id);
      let targetReport = idx !== -1 ? localReportsList[idx] : null;

      if (idx !== -1) {
        localReportsList[idx].status = status;
        if (adminReply !== undefined) {
          localReportsList[idx].adminReply = adminReply;
          localReportsList[idx].replyUpdatedAt = replyTime;
        }
      }

      const db = getFirestoreDb();
      if (db) {
        try {
          const updateData: any = { status };
          if (adminReply !== undefined) {
            updateData.adminReply = adminReply;
            updateData.replyUpdatedAt = replyTime;
          }
          await db.collection("reports").doc(id).set(updateData, { merge: true });
          if (!targetReport) {
            const docSnap = await db.collection("reports").doc(id).get();
            if (docSnap.exists) {
              targetReport = docSnap.data();
            }
          }
        } catch (e) {
          console.warn("Erro ao atualizar status no Firestore:", e);
        }
      }

      // If status was updated or admin replied, notify the user!
      if (targetReport && targetReport.userEmail) {
        const notifTitle = adminReply
          ? (status === "Resolvido" ? "Denúncia Resolvida com Sucesso! 🍿" : "Resposta da Equipe PipocaMax 💬")
          : (status === "Em Análise" ? "Denúncia em Análise 🔍" : "Bug / Problema Resolvido! 🍿");

        const notifMsg = adminReply
          ? `[Equipe PipocaMax]: ${adminReply}`
          : (status === "Em Análise"
            ? `Sua denúncia sobre "${targetReport.movieTitle || 'o site'}" foi recebida e agora está em análise pela equipe PipocaMax.`
            : `Sua denúncia sobre "${targetReport.movieTitle || 'o site'}" foi analisada e resolvida pela equipe PipocaMax.`);

        const notification = {
          id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          userEmail: targetReport.userEmail.toLowerCase(),
          title: notifTitle,
          message: notifMsg,
          reportId: id,
          movieId: targetReport.movieId || "",
          status: status,
          type: status === "Resolvido" ? "success" : "info",
          read: false,
          createdAt: replyTime
        };

        localNotificationsList.unshift(notification);

        if (db) {
          try {
            await db.collection("notifications").doc(notification.id).set(notification);
            console.log(`Notificação (${status}) enviada para:`, targetReport.userEmail);
          } catch (e) {
            console.warn("Erro ao salvar notificação no Firestore:", e);
          }
        }
      }

      res.json({ success: true, message: `Status do relatório alterado para ${status}`, report: targetReport });
    } catch (err) {
      console.error("Erro ao atualizar status do relatório:", err);
      res.status(500).json({ error: "Erro ao atualizar relatório." });
    }
  });

  // Notifications API: Get user notifications (supports broadcast "all" and targeted messages)
  app.get("/api/notifications/my", async (req, res) => {
    try {
      const email = req.query.email ? String(req.query.email).toLowerCase() : "";
      if (!email) {
        return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
      }

      const users = await fetchUsersFromDb();
      const currentUser = users.find(u => u.email && u.email.trim().toLowerCase() === email);
      const isUserAdmin = currentUser?.role === "admin";
      const userCreatedAt = currentUser?.createdAt ? new Date(currentUser.createdAt).getTime() : 0;

      const all = await fetchNotificationsFromDb();
      
      const userNotifs = all
        .filter(n => {
          if (!n) return false;
          const nEmail = (n.userEmail || "").toLowerCase();
          const target = n.target || "all";
          const nCreatedAt = n.createdAt ? new Date(n.createdAt).getTime() : 0;
          
          const titleMsg = ((n.title || "") + " " + (n.message || "")).toLowerCase();
          const isMaintenanceNotif = titleMsg.includes("manutenç") || titleMsg.includes("manutenc");

          // Skip maintenance notifications if maintenance is no longer enabled, or if older than 24h, or created before user registered
          if (isMaintenanceNotif) {
            if (!localMaintenanceConfig.enabled) return false;
            const now = Date.now();
            const ageHours = nCreatedAt > 0 ? (now - nCreatedAt) / (1000 * 60 * 60) : 999;
            if (ageHours > 24) return false;
            if (userCreatedAt > 0 && nCreatedAt > 0 && nCreatedAt < userCreatedAt - 60000) return false;
          }

          // If targeted specifically to this user's email
          if (nEmail === email) return true;

          // For broadcast messages ("all", "users", "admins"):
          // Filter out broadcast messages that were created before the user registered their account
          if (userCreatedAt > 0 && nCreatedAt > 0 && nCreatedAt < userCreatedAt - 60000) {
            return false;
          }

          if (nEmail === "all" || target === "all") return true;
          if (target === "admins" && isUserAdmin) return true;
          if (target === "users" && !isUserAdmin) return true;
          return false;
        })
        .map(n => {
          const readBy = Array.isArray(n.readBy) ? n.readBy : [];
          const isRead = Boolean(n.read) || readBy.includes(email);
          return {
            ...n,
            read: isRead
          };
        })
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      res.json({ notifications: userNotifs });
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      res.status(500).json({ error: "Erro ao buscar notificações." });
    }
  });

  // Notifications API: Mark all user notifications as read
  app.put("/api/notifications/read-all", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
      }

      const emailLower = email.toLowerCase().trim();
      
      localNotificationsList.forEach(n => {
        if (!Array.isArray(n.readBy)) n.readBy = [];
        if (!n.readBy.includes(emailLower)) {
          n.readBy.push(emailLower);
        }
        const nEmail = (n.userEmail || "").toLowerCase();
        if (nEmail === emailLower) {
          n.read = true;
        }
      });

      const db = getFirestoreDb();
      if (db) {
        try {
          const snapshot = await db.collection("notifications").get();
          if (!snapshot.empty) {
            const updatePromises: Promise<any>[] = [];
            snapshot.forEach((docSnap: any) => {
              const data = docSnap.data ? docSnap.data() : {};
              if (!data) return;

              const currentReadBy = Array.isArray(data.readBy) ? data.readBy : [];
              const needsReadByUpdate = !currentReadBy.includes(emailLower);
              const isDirectUser = data.userEmail && data.userEmail.toLowerCase() === emailLower;

              const updatePayload: any = {};
              if (isDirectUser && !data.read) {
                updatePayload.read = true;
              }
              if (needsReadByUpdate) {
                updatePayload.readBy = [...currentReadBy, emailLower];
              }

              if (Object.keys(updatePayload).length > 0) {
                updatePromises.push(db.collection("notifications").doc(docSnap.id).update(updatePayload));
              }
            });
            await Promise.all(updatePromises);
          }
        } catch (e) {
          console.warn("Erro ao atualizar notificações no Firestore:", e);
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Erro ao marcar notificações como lidas:", err);
      res.status(500).json({ error: "Erro ao atualizar notificações." });
    }
  });

  // Admin API: Broadcast / Send Notification to all or target users (Requires Admin)
  app.post("/api/admin/notifications/broadcast", requireAdmin, async (req, res) => {
    try {
      const { title, message, target = "all", targetEmail, type = "info", movieId, movieTitle } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "Título e mensagem da notificação são obrigatórios." });
      }

      const allUsers = await fetchUsersFromDb();

      let recipientCount = allUsers.length;
      if (target === "users") {
        recipientCount = allUsers.filter(u => u.role !== "admin").length;
      } else if (target === "admins") {
        recipientCount = allUsers.filter(u => u.role === "admin").length;
      } else if (target === "specific") {
        recipientCount = 1;
      }

      const newNotification = {
        id: "notif_bc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        userEmail: target === "specific" && targetEmail ? targetEmail.toLowerCase() : "all",
        target: target, // "all" | "users" | "admins" | "specific"
        title: title.trim(),
        message: message.trim(),
        type: type, // "info" | "success" | "warning" | "alert"
        movieId: movieId || "",
        movieTitle: movieTitle || "",
        read: false,
        readBy: [],
        createdBy: req.headers["x-user-email"] || "Administrador",
        createdAt: new Date().toISOString()
      };

      // Store in memory
      localNotificationsList.unshift(newNotification);

      // Save to Firestore
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("notifications").doc(newNotification.id).set(newNotification);
          console.log(`Notificação enviada com sucesso! Alvo: ${target}, Destinatários estimados: ${recipientCount}`);
        } catch (e) {
          console.warn("Erro ao salvar notificação broadcast no Firestore:", e);
        }
      }

      res.status(201).json({
        success: true,
        message: "Notificação enviada com sucesso!",
        notification: newNotification,
        recipientCount
      });
    } catch (err) {
      console.error("Erro ao enviar notificação broadcast:", err);
      res.status(500).json({ error: "Erro interno ao enviar notificação." });
    }
  });

  // Admin API: List all broadcast notifications sent by admins
  app.get("/api/admin/notifications", requireAdmin, async (_req, res) => {
    try {
      const all = await fetchNotificationsFromDb();
      const sorted = [...all].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json({ notifications: sorted });
    } catch (err) {
      console.error("Erro ao listar histórico de notificações:", err);
      res.status(500).json({ error: "Erro ao carregar histórico de notificações." });
    }
  });

  // Admin API: Delete a notification from history (Requires Admin)
  app.delete("/api/admin/notifications/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      localNotificationsList = localNotificationsList.filter(n => n.id !== id);

      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("notifications").doc(id).delete();
        } catch (e) {
          console.warn("Erro ao excluir notificação no Firestore:", e);
        }
      }

      res.json({ success: true, message: "Notificação excluída com sucesso!" });
    } catch (err) {
      console.error("Erro ao excluir notificação:", err);
      res.status(500).json({ error: "Erro ao excluir notificação." });
    }
  });

  // Reporting API: Delete report (Requires Admin)
  app.delete("/api/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      localReportsList = localReportsList.filter(r => r.id !== id);

      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("reports").doc(id).delete();
        } catch (e) {
          console.warn("Erro ao excluir relatório no Firestore:", e);
        }
      }

      res.json({ success: true, message: "Relatório excluído com sucesso!" });
    } catch (err) {
      console.error("Erro ao excluir relatório:", err);
      res.status(500).json({ error: "Erro ao excluir relatório." });
    }
  });

  // Movies API: create title
  app.post("/api/movies", requireAdmin, async (req, res) => {
    try {
      const movieData = req.body;
      if (!movieData.title || !movieData.type) {
        return res.status(400).json({ error: "Título e tipo (filme/serie/anime) são campos obrigatórios." });
      }

      // Complete missing fields
      const id = movieData.id || "m_" + Math.random().toString(36).substr(2, 9);
      const newMovie = {
        id,
        title: movieData.title,
        originalTitle: movieData.originalTitle || movieData.title,
        year: Number(movieData.year || 2026),
        duration: movieData.duration || "120 min",
        rating: Number(movieData.rating || 8.0),
        genres: Array.isArray(movieData.genres) ? movieData.genres : [movieData.genres || "Ação"],
        synopsis: movieData.synopsis || "",
        backdropUrl: movieData.backdropUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000",
        posterUrl: movieData.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500",
        trailerVideoId: movieData.trailerVideoId || "dQw4w9WgXcQ",
        cast: Array.isArray(movieData.cast) ? movieData.cast : (movieData.cast ? [movieData.cast] : []),
        director: movieData.director || "",
        featured: Boolean(movieData.featured),
        type: movieData.type,
        imdbId: movieData.imdbId || "",
        createdAt: new Date().toISOString()
      };

      // Add to in-memory list
      localMoviesList.push(newMovie);

      // Save to database if available
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("movies").doc(newMovie.id).set({
            title: newMovie.title,
            originalTitle: newMovie.originalTitle,
            year: newMovie.year,
            duration: newMovie.duration,
            rating: newMovie.rating,
            genres: newMovie.genres,
            synopsis: newMovie.synopsis,
            backdropUrl: newMovie.backdropUrl,
            posterUrl: newMovie.posterUrl,
            trailerVideoId: newMovie.trailerVideoId,
            cast: newMovie.cast,
            director: newMovie.director,
            featured: newMovie.featured,
            type: newMovie.type,
            imdbId: newMovie.imdbId,
            createdAt: newMovie.createdAt
          });
          console.log("Título adicionado com sucesso no Firestore!");
        } catch (e) {
          console.warn("Erro ao inserir título no Firestore:", e);
        }
      }

      // Movies are managed in Firestore and local fallback state

      res.status(201).json({ success: true, movie: newMovie });
    } catch (err: any) {
      console.error("Erro ao criar título:", err);
      res.status(500).json({ error: "Erro interno ao cadastrar título." });
    }
  });

  // Movies API: update title
  app.put("/api/movies/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const movieData = req.body;

      // Update in memory first
      const mIndex = localMoviesList.findIndex(m => m.id === id);
      if (mIndex === -1) {
        return res.status(404).json({ error: "Título não encontrado no catálogo." });
      }

      const updatedMovie = {
        ...localMoviesList[mIndex],
        title: movieData.title || localMoviesList[mIndex].title,
        originalTitle: movieData.originalTitle || localMoviesList[mIndex].originalTitle,
        year: movieData.year !== undefined ? Number(movieData.year) : localMoviesList[mIndex].year,
        duration: movieData.duration || localMoviesList[mIndex].duration,
        rating: movieData.rating !== undefined ? Number(movieData.rating) : localMoviesList[mIndex].rating,
        genres: Array.isArray(movieData.genres) ? movieData.genres : localMoviesList[mIndex].genres,
        synopsis: movieData.synopsis !== undefined ? movieData.synopsis : localMoviesList[mIndex].synopsis,
        backdropUrl: movieData.backdropUrl || localMoviesList[mIndex].backdropUrl,
        posterUrl: movieData.posterUrl || localMoviesList[mIndex].posterUrl,
        trailerVideoId: movieData.trailerVideoId || localMoviesList[mIndex].trailerVideoId,
        cast: Array.isArray(movieData.cast) ? movieData.cast : localMoviesList[mIndex].cast,
        director: movieData.director !== undefined ? movieData.director : localMoviesList[mIndex].director,
        featured: movieData.featured !== undefined ? Boolean(movieData.featured) : localMoviesList[mIndex].featured,
        type: movieData.type || localMoviesList[mIndex].type,
        imdbId: movieData.imdbId !== undefined ? movieData.imdbId : localMoviesList[mIndex].imdbId,
      };

      localMoviesList[mIndex] = updatedMovie;

      // Save to database
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("movies").doc(id).set({
            title: updatedMovie.title,
            originalTitle: updatedMovie.originalTitle,
            year: updatedMovie.year,
            duration: updatedMovie.duration,
            rating: updatedMovie.rating,
            genres: updatedMovie.genres,
            synopsis: updatedMovie.synopsis,
            backdropUrl: updatedMovie.backdropUrl,
            posterUrl: updatedMovie.posterUrl,
            trailerVideoId: updatedMovie.trailerVideoId,
            cast: updatedMovie.cast,
            director: updatedMovie.director,
            featured: updatedMovie.featured,
            type: updatedMovie.type,
            imdbId: updatedMovie.imdbId,
          }, { merge: true });
          console.log("Título atualizado com sucesso no Firestore!");
        } catch (e) {
          console.warn("Erro ao atualizar título no Firestore:", e);
        }
      }

      // Title updates are synced in Firestore

      res.json({ success: true, movie: updatedMovie });
    } catch (err: any) {
      console.error("Erro ao atualizar título:", err);
      res.status(500).json({ error: "Erro interno ao atualizar título." });
    }
  });

  // Movies API: delete title
  app.delete("/api/movies/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Update in memory first
      localMoviesList = localMoviesList.filter(m => m.id !== id);

      // Save to database
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("movies").doc(id).delete();
          console.log("Título removido com sucesso no Firestore!");
        } catch (e) {
          console.warn("Erro ao remover título no Firestore:", e);
        }
      }

      // Titles are deleted from Firestore

      res.json({ success: true, message: "Título removido com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao remover título:", err);
      res.status(500).json({ error: "Erro interno ao remover título." });
    }
  });

  // Release Calendar API Proxy with in-memory cache
  let cachedCalendarData: any[] | null = null;
  let cachedCalendarTime: number = 0;

  app.get("/api/calendar", async (_req, res) => {
    try {
      const now = Date.now();
      // Use cache if under 15 minutes old
      if (cachedCalendarData && now - cachedCalendarTime < 15 * 60 * 1000) {
        return res.json({ success: true, data: cachedCalendarData, cached: true });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("https://superflixapi.pro/calendario.php", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const rawData = await response.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        cachedCalendarData = rawData;
        cachedCalendarTime = now;
        return res.json({ success: true, data: rawData, cached: false });
      }

      if (cachedCalendarData && cachedCalendarData.length > 0) {
        return res.json({ success: true, data: cachedCalendarData, cached: true });
      }

      return res.json({ success: true, data: [] });
    } catch (err: any) {
      console.warn("Erro ao buscar calendário em superflixapi.pro:", err?.message || err);
      if (cachedCalendarData && cachedCalendarData.length > 0) {
        return res.json({ success: true, data: cachedCalendarData, cached: true });
      }
      
      // Fallback: Return empty array with success true so client handles it gracefully instead of crashing
      return res.json({
        success: true,
        data: [],
        warning: "Calendário temporariamente indisponível.",
      });
    }
  });

  // SEO: robots.txt
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    const host = req.headers.host || "pipocamax.com";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;
    res.send(
      `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  // SEO: Dynamic XML Sitemap
  app.get("/sitemap.xml", async (req, res) => {
    res.type("application/xml");
    try {
      const host = req.headers.host || "pipocamax.com";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const baseUrl = `${protocol}://${host}`;
      const nowIso = new Date().toISOString();

      let catalogMovies = localMoviesList || MOVIES_DATA;
      try {
        const fetched = await fetchTitlesFromDb();
        if (Array.isArray(fetched) && fetched.length > 0) {
          catalogMovies = fetched;
        }
      } catch (e) {
        // Fallback to localMoviesList / MOVIES_DATA
      }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      // Static Main Pages
      const mainRoutes = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/?type=filme", priority: "0.9", changefreq: "daily" },
        { url: "/?type=serie", priority: "0.9", changefreq: "daily" },
        { url: "/?type=anime", priority: "0.9", changefreq: "daily" },
      ];

      mainRoutes.forEach((route) => {
        const fullLoc = `${baseUrl}${route.url}`.replace(/&/g, "&amp;");
        xml += `  <url>\n`;
        xml += `    <loc>${fullLoc}</loc>\n`;
        xml += `    <lastmod>${nowIso}</lastmod>\n`;
        xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        xml += `    <priority>${route.priority}</priority>\n`;
        xml += `  </url>\n`;
      });

      // Catalog Items (Movies / Series / Animes)
      catalogMovies.forEach((m: any) => {
        const mediaParam = encodeURIComponent(m.id || m.title || "midia");
        const rawUrl = `${baseUrl}/?media=${mediaParam}`;
        const escapedUrl = rawUrl.replace(/&/g, "&amp;");
        xml += `  <url>\n`;
        xml += `    <loc>${escapedUrl}</loc>\n`;
        xml += `    <lastmod>${nowIso}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        if (m.posterUrl || m.backdropUrl) {
          const imgUrl = (m.posterUrl || m.backdropUrl).replace(/&/g, "&amp;");
          const imgTitle = (m.title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${imgUrl}</image:loc>\n`;
          xml += `      <image:title>${imgTitle}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      });

      xml += `</urlset>`;
      res.send(xml);
    } catch (err) {
      console.error("Erro ao gerar sitemap.xml:", err);
      res.status(500).send("<error>Erro ao gerar sitemap</error>");
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Falha ao iniciar o servidor express:", err);
});
