"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { UserDoc } from "@/lib/types";

export default function AdminUsuariosPage() {
  const { getToken, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    const token = await getToken();
    const res = await apiFetch("/api/admin/users", token);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patchUser(uid: string, patch: { role?: string; status?: string }) {
    setBusyUid(uid);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch("/api/admin/users", token, {
        method: "PATCH",
        body: JSON.stringify({ uid, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al actualizar el usuario");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyUid(null);
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="animate-enter">
      <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Usuarios</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {users.length} usuario{users.length === 1 ? "" : "s"} registrado{users.length === 1 ? "" : "s"}.
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o correo…"
        className="field mt-4 max-w-sm"
      />

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {filtered.map((u) => {
          const isSelf = u.uid === currentUser?.uid;
          const busy = busyUid === u.uid;
          return (
            <div key={u.uid} className="surface-card flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                  {u.displayName}
                  {isSelf && <span className="badge bg-[var(--surface-sunken)] text-[var(--foreground-faint)]">Tú</span>}
                  {u.role === "admin" && (
                    <span className="badge bg-[var(--brand-tint)] text-[var(--brand-active)]">Admin</span>
                  )}
                  {u.status === "bloqueado" && (
                    <span className="badge bg-[var(--danger-bg)] text-[var(--danger)]">Bloqueado</span>
                  )}
                </p>
                <p className="truncate text-[13px] text-[var(--foreground-faint)]">{u.email}</p>
                <p className="mt-0.5 font-data text-[11.5px] text-[var(--foreground-faint)]">
                  ref: {u.referralCode}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => patchUser(u.uid, { role: u.role === "admin" ? "vendedor" : "admin" })}
                  disabled={busy || isSelf}
                  title={isSelf ? "No puedes cambiar tu propio rol" : undefined}
                  className="btn btn-secondary px-3 py-1.5 text-[12.5px]"
                >
                  {u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                </button>
                <button
                  onClick={() =>
                    patchUser(u.uid, { status: u.status === "bloqueado" ? "activo" : "bloqueado" })
                  }
                  disabled={busy || isSelf}
                  title={isSelf ? "No puedes bloquearte a ti mismo" : undefined}
                  className={`btn px-3 py-1.5 text-[12.5px] ${
                    u.status === "bloqueado" ? "btn-success" : "btn-danger-outline"
                  }`}
                >
                  {u.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--foreground-faint)]">
            No hay usuarios que coincidan con la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}
