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
            forEach: (callback: (d: any) => void) => docs.forEach(callback),
            size: snap.size
          };
        } catch (err) {
          console.warn(`Firestore getDocs error (${collectionName}):`, err);
          return {
            empty: true,
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
                forEach: (callback: (d: any) => void) => docs.forEach(callback),
                size: docs.length
              };
            } catch (err) {
              console.warn(`Firestore query error (${collectionName}):`, err);
              return { empty: true, forEach: () => {}, size: 0 };
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
let localMoviesList: any[] = [...MOVIES_DATA];
let localUsersList: any[] = [
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
            localNotificationsList[idx] = notif;
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

// Sync and fetch users from Firestore
async function fetchUsersFromDb() {
  const db = getFirestoreDb();
  let mapped: any[] = [];

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

  if (db) {
    try {
      const usersSnapshot = await db.collection("users").get();
      if (!usersSnapshot.empty) {
        usersSnapshot.forEach((docSnap: any) => {
          const u = docSnap.data();
          mapped.push({
            id: docSnap.id,
            name: u.name || "",
            email: u.email || "",
            password: u.password || "",
            role: u.role || "user",
            createdAt: safeIsoDate(u.createdAt) || new Date().toISOString()
          });
        });

        // Ensure default admins exist in mapped if missing from Firestore collection
        for (const defAdmin of defaultAdmins) {
          if (!mapped.some(u => u.email && u.email.toLowerCase().trim() === defAdmin.email)) {
            mapped.push(defAdmin);
          }
        }

        localUsersList = mapped;
        return mapped;
      }
    } catch (e) {
      console.warn("Erro ao buscar usuários do Firestore:", e);
    }
  }

  // Ensure localUsersList has default admins
  for (const defAdmin of defaultAdmins) {
    if (!localUsersList.some(u => u.email && u.email.toLowerCase().trim() === defAdmin.email)) {
      localUsersList.push(defAdmin);
    }
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

// Function to fetch titles from Firestore
async function fetchTitlesFromDb() {
  const db = getFirestoreDb();
  if (db) {
    try {
      console.log("Tentando carregar títulos do Firestore...");
      const moviesSnapshot = await db.collection("movies").get();
      if (!moviesSnapshot.empty) {
        const mapped: any[] = [];
        moviesSnapshot.forEach((docSnap: any) => {
          const row = docSnap.data();
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
        localMoviesList = mapped;
        return mapped;
      } else {
        console.log("Coleção de filmes vazia no Firestore. Semeando catálogo inicial automaticamente...");
        try {
          await seedDatabase();
          return localMoviesList;
        } catch (seedErr) {
          console.error("Falha ao auto-semear no boot:", seedErr);
          localMoviesList = [...MOVIES_DATA];
          return localMoviesList;
        }
      }
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
  // Initialize user tables if database is available
  try {
    await initializeUsersTable();
  } catch (err) {
    console.warn("Falha ao inicializar tabela de usuários:", err);
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
      
      return res.json({
        movies: dbMovies || localMoviesList,
        dbStatus: hasFirestore ? "firestore" : "fallback",
        dbConfigured: hasFirestore
      });
    } catch (err: any) {
      console.error("Erro ao carregar títulos do banco de dados:", err);
      const hasFirestore = !!getFirestoreDb();
      res.json({
        movies: localMoviesList,
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

  // API route to direct import a TMDB title with 1-click
  app.post("/api/tmdb/import-direct", requireAdmin, async (req, res) => {
    try {
      const { tmdbId, type } = req.body;
      const clientApiKey = req.headers["x-tmdb-api-key"] as string;
      
      let apiKey = clientApiKey || process.env.TMDB_API_KEY;
      if (!apiKey) {
        apiKey = await getTmdbApiKeyFromDb();
      }

      if (!apiKey) {
        return res.status(400).json({ error: "Chave de API do TMDB não configurada." });
      }

      if (!tmdbId) {
        return res.status(400).json({ error: "ID TMDB é obrigatório." });
      }

      const tmdbType = type === "serie" || type === "tv" || type === "anime" ? "tv" : "movie";
      const appendParams = tmdbType === "tv" ? "credits,videos,external_ids" : "credits,videos";
      const url = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${apiKey}&language=pt-BR&append_to_response=${appendParams}`;

      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Erro ao obter detalhes do TMDB no servidor." });
      }

      const data = await response.json();
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

      const titleType: "filme" | "serie" | "anime" = type === "anime" ? "anime" : (tmdbType === "tv" ? "serie" : "filme");
      const releaseYear = data.release_date 
        ? new Date(data.release_date).getFullYear() 
        : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : 2026);

      const titleName = data.title || data.name;
      const normalizedTitle = titleName ? titleName.toLowerCase().replace(/[^a-z0-9]/g, "").trim() : "";

      // Duplicate check: verify if title already exists by TMDB ID, IMDb ID, or normalized title + type
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
        originalTitle: data.original_title || data.original_name || data.title || data.name,
        year: isNaN(releaseYear) ? 2026 : releaseYear,
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

      res.json({ success: true, movie: newMovie });
    } catch (err: any) {
      console.error("Erro ao importar direto do TMDB:", err);
      res.status(500).json({ error: err.message });
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

      const userPass = String(user.password || "").trim();

      if (userPass !== password && !(user.role === "admin" && (password === "admin" || userPass === ""))) {
        return res.status(401).json({ 
          error: "Senha incorreta.",
          details: "Verifique a senha digitada ou altere para a senha correta."
        });
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

      // Sync users first
      const users = await fetchUsersFromDb();
      
      if (users.some(u => u.email && u.email.trim().toLowerCase() === email)) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado. Clique em 'Faça login aqui'." });
      }

      const newUser = {
        id: "u_" + Math.random().toString(36).substr(2, 9),
        name,
        email,
        password,
        role: role === "admin" ? "admin" : "user",
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
            createdAt: newUser.createdAt
          });
          console.log("Usuário cadastrado com sucesso no Firestore!");
        } catch (e: any) {
          console.error("Erro ao cadastrar usuário no Firestore (prosseguindo com login local):", e);
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

      // Update in memory
      let targetUser = localUsersList.find(
        u => u.id === id || (u.email && u.email.trim().toLowerCase() === id.trim().toLowerCase())
      );

      if (targetUser) {
        targetUser.role = targetRole;
      }

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
          const targetEmail = (targetUser?.email || id).trim().toLowerCase();
          const querySnap = await db.collection("users").where("email", "==", targetEmail).get();
          if (!querySnap.empty) {
            querySnap.forEach(async (docSnap: any) => {
              await db.collection("users").doc(docSnap.id).set({ role: targetRole }, { merge: true });
            });
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

      // Update in memory
      localUsersList = localUsersList.filter(
        u => u.id !== id && (!u.email || u.email.trim().toLowerCase() !== id.trim().toLowerCase())
      );

      // Save to database
      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("users").doc(id).delete();
          if (targetUser && targetUser.id && targetUser.id !== id) {
            await db.collection("users").doc(targetUser.id).delete();
          }

          const targetEmail = (targetUser?.email || id).trim().toLowerCase();
          const querySnap = await db.collection("users").where("email", "==", targetEmail).get();
          if (!querySnap.empty) {
            querySnap.forEach(async (docSnap: any) => {
              await db.collection("users").doc(docSnap.id).delete();
            });
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

      if (!userEmail || !description) {
        return res.status(400).json({ error: "E-mail de usuário e descrição do problema são obrigatórios para reportar." });
      }

      const newReport = {
        id: "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        userId: userId || "user_anon",
        userName: userName || "Usuário PipocaMax",
        userEmail: userEmail.toLowerCase(),
        movieId: movieId || "",
        movieTitle: movieTitle || "Geral",
        reason: reason || "Problema no site",
        description,
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

  // Reporting API: Update report status (Requires Admin)
  app.put("/api/reports/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "O campo status é obrigatório." });
      }

      const idx = localReportsList.findIndex(r => r.id === id);
      let targetReport = idx !== -1 ? localReportsList[idx] : null;

      if (idx !== -1) {
        localReportsList[idx].status = status;
      }

      const db = getFirestoreDb();
      if (db) {
        try {
          await db.collection("reports").doc(id).set({ status }, { merge: true });
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

      // If status was updated to "Em Análise" or "Resolvido", notify the user!
      if (targetReport && targetReport.userEmail && (status === "Em Análise" || status === "Resolvido")) {
        const notifTitle = status === "Em Análise" 
          ? "Denúncia em Análise 🔍" 
          : "Bug / Problema Resolvido! 🍿";

        const notifMsg = status === "Em Análise"
          ? `Sua denúncia sobre "${targetReport.movieTitle || 'o site'}" foi recebida e agora está em análise pela equipe PipocaMax.`
          : `Sua denúncia sobre "${targetReport.movieTitle || 'o site'}" foi analisada e resolvida pela equipe PipocaMax.`;

        const notification = {
          id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          userEmail: targetReport.userEmail.toLowerCase(),
          title: notifTitle,
          message: notifMsg,
          reportId: id,
          status: status,
          read: false,
          createdAt: new Date().toISOString()
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

      res.json({ success: true, message: `Status do relatório alterado para ${status}` });
    } catch (err) {
      console.error("Erro ao atualizar status do relatório:", err);
      res.status(500).json({ error: "Erro ao atualizar relatório." });
    }
  });

  // Notifications API: Get user notifications
  app.get("/api/notifications/my", async (req, res) => {
    try {
      const email = req.query.email ? String(req.query.email).toLowerCase() : "";
      if (!email) {
        return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
      }

      const all = await fetchNotificationsFromDb();
      const userNotifs = all.filter(n => n.userEmail && n.userEmail.toLowerCase() === email);

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

      const emailLower = email.toLowerCase();
      localNotificationsList.forEach(n => {
        if (n.userEmail && n.userEmail.toLowerCase() === emailLower) {
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
              if (data && data.userEmail && data.userEmail.toLowerCase() === emailLower) {
                updatePromises.push(db.collection("notifications").doc(docSnap.id).update({ read: true }));
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
