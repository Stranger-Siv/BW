"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreateTournamentModal, type TournamentSubmitPayload } from "@/components/admin/CreateTournamentModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

type TournamentDoc = {
  _id: string;
  name: string;
  type?: string;
  date: string;
  startTime: string;
  registrationDeadline: string;
  maxTeams: number;
  teamSize: number;
  registeredTeams: number;
  status: string;
  description?: string;
  prize?: string;
  serverIP?: string;
  isClosed: boolean;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-500/20 text-slate-400 dark:text-slate-300",
    registration_open: "bg-emerald-500/20 text-emerald-400 dark:text-emerald-300",
    registration_closed: "bg-amber-500/20 text-amber-400 dark:text-amber-300",
    ongoing: "bg-blue-500/20 text-blue-400 dark:text-blue-300",
    completed: "bg-slate-500/20 text-slate-400 dark:text-slate-300",
  };
  const cls = map[status] ?? map.draft;
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminTournamentsPage() {
  const [list, setList] = useState<TournamentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTournament, setEditTournament] = useState<TournamentDoc | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deleteTournament, setDeleteTournament] = useState<TournamentDoc | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tournaments");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load tournaments");
      }
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openCreate = useCallback(() => {
    setEditTournament(null);
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((t: TournamentDoc) => {
    setEditTournament(t);
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: TournamentSubmitPayload) => {
      setSubmitLoading(true);
      setSubmitError(null);
      try {
        if (editTournament?._id) {
          const res = await fetch(`/api/admin/tournaments/${editTournament._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              type: data.type,
              date: data.date,
              startTime: data.startTime,
              registrationDeadline: data.registrationDeadline,
              maxTeams: data.maxTeams,
              teamSize: data.teamSize,
              status: data.status,
              description: data.description,
              prize: data.prize,
              serverIP: data.serverIP,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error ?? "Update failed");
        } else {
          const res = await fetch("/api/admin/tournaments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error ?? "Create failed");
        }
        setModalOpen(false);
        fetchList();
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setSubmitLoading(false);
      }
    },
    [editTournament, fetchList]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTournament) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${deleteTournament._id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      setDeleteTournament(null);
      fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTournament, fetchList]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Tournaments
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Create tournaments and manage their settings. Use the Dashboard to view teams per tournament.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="min-h-[44px] flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="btn-gradient min-h-[44px] px-5 py-2.5 text-sm"
            >
              + Create tournament
            </button>
          </div>
        </header>

        <div className="card-glass p-4 shadow-lg sm:p-6 md:p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500 dark:text-slate-400">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Loading…
            </div>
          ) : list.length === 0 ? (
            <div className="card-glass py-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                No tournaments yet.
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Click &quot;+ Create tournament&quot; above to open the form and add your first tournament.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="btn-gradient mt-4 px-5 py-2.5 text-sm"
              >
                + Create tournament
              </button>
            </div>
          ) : (
            <div className="card-glass overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 dark:border-white/10">
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Teams</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr
                      key={t._id}
                      className="border-b border-white/10 transition last:border-0 hover:bg-white/5 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {t.name}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">
                        {t.type ?? "squad"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {t.date} {t.startTime}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {t.registeredTeams} / {t.maxTeams}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/tournaments/${t._id}/rounds`}
                            className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:opacity-90"
                          >
                            Rounds
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/15 dark:text-slate-400 dark:hover:bg-white/15"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTournament(t)}
                            className="rounded-full border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30 dark:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateTournamentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTournament(null); }}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={submitError}
        editData={editTournament ? {
          _id: editTournament._id,
          name: editTournament.name,
          type: editTournament.type ?? "squad",
          date: editTournament.date,
          startTime: editTournament.startTime,
          registrationDeadline: editTournament.registrationDeadline,
          maxTeams: String(editTournament.maxTeams),
          teamSize: String(editTournament.teamSize),
          prize: editTournament.prize ?? "",
          serverIP: editTournament.serverIP ?? "",
          description: editTournament.description ?? "",
          status: editTournament.status,
        } : null}
      />

      <ConfirmModal
        open={!!deleteTournament}
        title="Delete tournament"
        message={
          deleteTournament
            ? `Delete "${deleteTournament.name}"? This cannot be undone. Only allowed when no teams are registered.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTournament(null)}
        loading={deleteLoading}
      />
    </main>
  );
}
