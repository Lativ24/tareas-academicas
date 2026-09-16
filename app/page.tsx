"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Clock3, RefreshCw, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Task = {
  ID: string; Usuario: string; Materia: string; Tarea: string; Tipo: string;
  Fecha: string; Hora: string; Prioridad: "Alta" | "Media" | "Baja";
  Estado: "Pendiente" | "Completada"; FechaRegistro: string;
  RecordatorioEnviado: "Si" | "No";
};

const ENDPOINT = "/api/tasks";
const FALLBACK_TASKS: Task[] = [
  { ID: "T-EJEM01", Usuario: "123456789", Materia: "Bases de Datos", Tarea: "Proyecto final", Tipo: "Proyecto", Fecha: "2026-09-18", Hora: "23:59", Prioridad: "Alta", Estado: "Pendiente", FechaRegistro: "2026-09-09 10:00", RecordatorioEnviado: "No" },
  { ID: "T-EJEM02", Usuario: "123456789", Materia: "Paradigmas", Tarea: "Estudiar Prolog para el examen", Tipo: "Examen", Fecha: "2026-09-20", Hora: "18:00", Prioridad: "Alta", Estado: "Pendiente", FechaRegistro: "2026-09-09 10:05", RecordatorioEnviado: "No" },
  { ID: "T-EJEM03", Usuario: "123456789", Materia: "Estadistica", Tarea: "Ejercicios de R", Tipo: "Tarea", Fecha: "2026-09-23", Hora: "23:59", Prioridad: "Media", Estado: "Completada", FechaRegistro: "2026-09-09 10:10", RecordatorioEnviado: "Si" },
  { ID: "T-UXH49X", Usuario: "8943420250", Materia: "Bases de Datos", Tarea: "Entregar la investigación", Tipo: "Tarea", Fecha: "2026-09-18", Hora: "23:59", Prioridad: "Media", Estado: "Completada", FechaRegistro: "2026-09-09 20:48", RecordatorioEnviado: "No" },
  { ID: "T-W5TR2Q", Usuario: "8943420250", Materia: "Redes", Tarea: "Entregar laboratorio", Tipo: "Tarea", Fecha: "2026-09-11", Hora: "23:59", Prioridad: "Alta", Estado: "Pendiente", FechaRegistro: "2026-09-10 17:30", RecordatorioEnviado: "Si" },
];

const formatter = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" });
function daysUntil(date: string) {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const due = new Date(`${date}T00:00:00`); const today = new Date(`${todayKey}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}
function dueLabel(task: Task) {
  if (task.Estado === "Completada") return "Completada";
  const days = daysUntil(task.Fecha);
  if (days < 0) return `Vencida · ${Math.abs(days)} d`;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}
function formatDate(date: string) { return formatter.format(new Date(`${date}T12:00:00`)).replace(".", ""); }
function priorityClass(priority: Task["Prioridad"]) {
  if (priority === "Alta") return "priority-high";
  if (priority === "Media") return "priority-medium";
  return "priority-low";
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(FALLBACK_TASKS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todas" | "Pendiente" | "Completada">("Todas");
  const [subject, setSubject] = useState("Todas");
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      if (!response.ok) throw new Error("No disponible");
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload.tasks;
      if (!Array.isArray(rows)) throw new Error("Formato inesperado");
      setTasks(rows); setConnected(true); setUpdatedAt(new Date());
    } catch { setConnected(false); } finally { setSyncing(false); }
  }, []);

  useEffect(() => {
    refresh(); const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "consultar_tareas", title: "Consultar tareas",
      description: "Busca tareas visibles por texto, materia o estado y devuelve los resultados actuales del panel.",
      inputSchema: { type: "object", properties: { consulta: { type: "string" }, materia: { type: "string" }, estado: { type: "string", enum: ["Todas", "Pendiente", "Completada"] } }, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input: unknown) {
        const value = (input ?? {}) as { consulta?: string; materia?: string; estado?: "Todas" | "Pendiente" | "Completada" };
        const allowed = ["Todas", "Pendiente", "Completada"];
        if (value.estado && !allowed.includes(value.estado)) {
          throw new Error("Estado inválido. Usa Todas, Pendiente o Completada.");
        }
        const needle = (value.consulta ?? "").trim().toLowerCase();
        const results = tasks.filter((task) => {
          const matchesText = !needle || `${task.Materia} ${task.Tarea} ${task.Tipo} ${task.ID}`.toLowerCase().includes(needle);
          const matchesSubject = !value.materia || task.Materia === value.materia;
          const matchesStatus = !value.estado || value.estado === "Todas" || task.Estado === value.estado;
          return matchesText && matchesSubject && matchesStatus;
        });
        return { cantidad: results.length, tareas: results };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [tasks]);

  const subjects = useMemo(() => ["Todas", ...Array.from(new Set(tasks.map((task) => task.Materia)))], [tasks]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesText = !needle || `${task.Materia} ${task.Tarea} ${task.Tipo} ${task.ID}`.toLowerCase().includes(needle);
      return matchesText && (status === "Todas" || task.Estado === status) && (subject === "Todas" || task.Materia === subject);
    }).sort((a, b) => a.Fecha.localeCompare(b.Fecha));
  }, [query, status, subject, tasks]);
  const stats = useMemo(() => {
    const pending = tasks.filter((task) => task.Estado === "Pendiente");
    return { pending: pending.length, urgent: pending.filter((task) => daysUntil(task.Fecha) <= 2).length, completed: tasks.filter((task) => task.Estado === "Completada").length, next: [...pending].sort((a, b) => a.Fecha.localeCompare(b.Fecha))[0] };
  }, [tasks]);

  return (
    <main className="min-h-screen pb-12 text-[#1d1d1f]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3"><span className="brand-mark" aria-hidden="true"><BookOpen size={19} strokeWidth={2.25} /></span><div><p className="text-[15px] font-semibold tracking-[-0.02em]">Tareas</p><p className="hidden text-xs text-[#6e6e73] sm:block">Asistente académico</p></div></div>
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full bg-black/[0.045] px-3 py-2 text-xs text-[#6e6e73] sm:flex"><span className={`status-dot ${connected ? "is-live" : ""}`} />{connected ? "Google Sheets conectado" : "Vista guardada"}</div>
            <Button variant="outline" size="icon" onClick={refresh} disabled={syncing} aria-label="Actualizar tareas" className="h-10 w-10 rounded-full border-black/10 bg-white shadow-none hover:bg-black/[0.04]"><RefreshCw size={17} className={syncing ? "animate-spin" : ""} /></Button>
            <div className="avatar" aria-label="Cuenta de estudiante">AV</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pt-8 sm:px-8 lg:px-12 lg:pt-11">
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="eyebrow">Martes, 15 de septiembre</p><h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Tus entregas, en orden.</h1></div>
          <div className="flex items-center gap-2 text-sm text-[#6e6e73]"><Clock3 size={15} />Actualizado {updatedAt ? updatedAt.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }) : "ahora"}</div>
        </section>

        <section className="summary-grid" aria-label="Resumen de tareas">
          <article className="summary-card summary-featured">
            <div className="flex items-start justify-between"><span className="summary-icon blue"><CalendarDays size={21} /></span><span className="summary-kicker">Siguiente entrega</span></div>
            {stats.next ? <><p className="mt-7 text-[1.75rem] font-semibold tracking-[-0.04em]">{stats.next.Materia}</p><p className="mt-1 line-clamp-1 text-[15px] text-[#6e6e73]">{stats.next.Tarea}</p><div className="mt-6 flex items-center justify-between"><span className="text-sm font-medium">{formatDate(stats.next.Fecha)} · {stats.next.Hora}</span><span className="due-pill">{dueLabel(stats.next)}</span></div></> : <p className="mt-8 text-xl font-semibold">Todo al día</p>}
          </article>
          <article className="summary-card"><span className="summary-icon indigo"><BookOpen size={21} /></span><p className="metric">{stats.pending}</p><p className="metric-label">Pendientes</p><p className="metric-note">En {new Set(tasks.filter((t) => t.Estado === "Pendiente").map((t) => t.Materia)).size} materias</p></article>
          <article className="summary-card"><span className="summary-icon orange"><Bell size={21} /></span><p className="metric">{stats.urgent}</p><p className="metric-label">Requieren atención</p><p className="metric-note">Vencidas o próximas 48 h</p></article>
          <article className="summary-card"><span className="summary-icon green"><CheckCircle2 size={21} /></span><p className="metric">{stats.completed}</p><p className="metric-label">Completadas</p><p className="metric-note">Registradas en la hoja</p></article>
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-black/[0.07] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.055)]">
          <div className="flex flex-col gap-4 border-b border-black/[0.06] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="flex items-center gap-2"><h2 className="text-xl font-semibold tracking-[-0.035em]">Todas las tareas</h2><span className="count-badge">{filtered.length}</span></div><p className="mt-1 text-sm text-[#86868b]">Se actualiza automáticamente cada 30 segundos.</p></div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <label className="search-control"><Search size={16} aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarea o materia" aria-label="Buscar tarea o materia" className="h-auto border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0" /></label>
              <label className="select-control"><SlidersHorizontal size={15} aria-hidden="true" /><select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Filtrar por materia">{subjects.map((value) => <option key={value} value={value}>{value}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></label>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-black/[0.06] px-5 py-3 scrollbar-none sm:px-6">
            {(["Todas", "Pendiente", "Completada"] as const).map((value) => <button key={value} onClick={() => setStatus(value)} className={`filter-chip ${status === value ? "is-active" : ""}`}>{value === "Pendiente" ? "Pendientes" : value === "Completada" ? "Completadas" : value}</button>)}
          </div>
          <div className="hidden lg:block">
            <Table><TableHeader><TableRow className="border-black/[0.06] hover:bg-transparent"><TableHead className="w-[41%] pl-7">Tarea</TableHead><TableHead>Entrega</TableHead><TableHead>Prioridad</TableHead><TableHead>Estado</TableHead><TableHead className="pr-7 text-right">Aviso</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((task) => <TableRow key={task.ID} className="group border-black/[0.055] hover:bg-[#f7f7f8]"><TableCell className="py-5 pl-7"><div className="flex items-center gap-3.5"><span className="subject-tile">{task.Materia.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-medium tracking-[-0.01em]">{task.Tarea}</p><p className="mt-0.5 text-[13px] text-[#86868b]">{task.Materia} · {task.Tipo}</p></div></div></TableCell><TableCell><p className="font-medium">{formatDate(task.Fecha)}</p><p className="mt-0.5 text-[13px] text-[#86868b]">{task.Hora}</p></TableCell><TableCell><span className={`priority ${priorityClass(task.Prioridad)}`}>{task.Prioridad}</span></TableCell><TableCell><span className={`state-label ${task.Estado === "Completada" ? "is-done" : daysUntil(task.Fecha) < 0 ? "is-late" : ""}`}>{task.Estado === "Completada" ? <CheckCircle2 size={15} /> : <span className="state-ring" />}{dueLabel(task)}</span></TableCell><TableCell className="pr-7 text-right"><span className="text-sm text-[#86868b]">{task.RecordatorioEnviado === "Si" ? "Enviado" : "Pendiente"}</span></TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
          <div className="divide-y divide-black/[0.06] lg:hidden">{filtered.map((task) => <article key={task.ID} className="p-5 sm:p-6"><div className="flex items-start gap-3.5"><span className="subject-tile shrink-0">{task.Materia.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="font-medium leading-snug">{task.Tarea}</p><p className="mt-1 text-sm text-[#86868b]">{task.Materia} · {task.Tipo}</p></div><span className={`priority ${priorityClass(task.Prioridad)}`}>{task.Prioridad}</span></div><div className="mt-4 flex items-center justify-between border-t border-black/[0.05] pt-4"><span className="text-sm font-medium">{formatDate(task.Fecha)} · {task.Hora}</span><span className={`state-label ${task.Estado === "Completada" ? "is-done" : daysUntil(task.Fecha) < 0 ? "is-late" : ""}`}>{task.Estado === "Completada" ? <CheckCircle2 size={15} /> : <span className="state-ring" />}{dueLabel(task)}</span></div></article>)}</div>
          {filtered.length === 0 && <div className="flex flex-col items-center px-6 py-16 text-center"><span className="summary-icon blue"><Search size={21} /></span><p className="mt-4 font-semibold">No encontramos tareas</p><p className="mt-1 text-sm text-[#86868b]">Prueba otra materia, estado o búsqueda.</p></div>}
        </section>
        <footer className="mt-6 flex flex-col justify-between gap-3 px-1 text-xs text-[#86868b] sm:flex-row sm:items-center"><p className="flex items-center gap-1.5"><Sparkles size={13} />Los recordatorios se procesan diariamente a las 7:00 a. m.</p><a href="https://docs.google.com/spreadsheets/d/1Joh7Pc-GMialZ-25IwIUwslrb-pMqqsiz9Pm0fVFcRA/edit?gid=0#gid=0" target="_blank" rel="noreferrer" className="font-medium text-[#0066cc] hover:underline">Abrir base de datos</a></footer>
      </div>
    </main>
  );
}

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; execute: (input: unknown) => unknown; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean } }, options?: { signal?: AbortSignal }) => void | Promise<void> };
  }
}
