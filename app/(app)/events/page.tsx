"use client";
import { useEffect, useState, useCallback } from "react";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  registrationCount: number;
  isRegistered: boolean;
}

interface Me {
  id: string;
  email: string;
  roles: string[];
  approvalStatus?: string;
}

const STAFF_ROLES = ["committee", "teacher", "school_staff", "admin"];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    location: "",
    capacity: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isApproved = me?.approvalStatus === "approved";
  const isStaff = me?.roles?.some((r) => STAFF_ROLES.includes(r)) ?? false;

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.items ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => null);
    loadEvents();
  }, [loadEvents]);

  async function toggleRegistration(event: EventItem) {
    if (!isApproved || registeringId) return;
    setRegisteringId(event.id);
    try {
      if (event.isRegistered) {
        await fetch(`/api/events/${event.id}/register`, { method: "DELETE" });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, isRegistered: false, registrationCount: e.registrationCount - 1 }
              : e
          )
        );
      } else {
        const res = await fetch(`/api/events/${event.id}/register`, { method: "POST" });
        if (res.ok) {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === event.id
                ? { ...e, isRegistered: true, registrationCount: e.registrationCount + 1 }
                : e
            )
          );
        }
      }
    } catch { /* ignore */ }
    setRegisteringId(null);
  }

  async function submitEvent() {
    if (!form.title.trim() || !form.startsAt) {
      setSubmitError("Název a datum začátku jsou povinné");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          startsAt: form.startsAt,
          endsAt: form.endsAt || undefined,
          location: form.location.trim() || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error?.message ?? "Odeslání selhalo");
      } else {
        setForm({ title: "", description: "", startsAt: "", endsAt: "", location: "", capacity: "" });
        setShowForm(false);
        await loadEvents();
      }
    } catch {
      setSubmitError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Akce</h1>
          <p className="text-sm text-gray-500 mt-1">Nadcházející školní události a akce</p>
        </div>
        {isApproved && isStaff && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            + Přidat akci
          </button>
        )}
      </div>

      {/* Create event form (staff only) */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">Nová akce</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Název akce"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Popis</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Volitelný popis akce…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Začátek *</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Konec</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Místo</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Volitelně"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kapacita</label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="Bez omezení"
              />
            </div>
          </div>
          {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
          <div className="flex gap-2">
            <button
              onClick={submitEvent}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting ? "Odesílám…" : "Vytvořit akci"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Zrušit
            </button>
          </div>
        </div>
      )}

      {!isApproved && me && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          Přihlašování na akce je dostupné pouze schváleným uživatelům.
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-32 animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center text-gray-400">
          Žádné nadcházející akce.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const isFull = event.capacity !== null && event.registrationCount >= event.capacity && !event.isRegistered;
            return (
              <div key={event.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{formatDateTime(event.startsAt)}</span>
                      {event.endsAt && <span>– {formatDateTime(event.endsAt)}</span>}
                      {event.location && <span>· {event.location}</span>}
                      {event.capacity !== null && (
                        <span className={`font-medium ${isFull ? "text-red-600" : "text-gray-500"}`}>
                          {event.registrationCount}/{event.capacity} míst
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isApproved ? (
                      <button
                        onClick={() => toggleRegistration(event)}
                        disabled={!!registeringId || (isFull && !event.isRegistered)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50
                          ${event.isRegistered
                            ? "bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800 border border-green-200 hover:border-red-200"
                            : isFull
                            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        title={event.isRegistered ? "Zrušit přihlášení" : isFull ? "Akce je plně obsazena" : "Přihlásit se"}
                      >
                        {registeringId === event.id
                          ? "…"
                          : event.isRegistered
                          ? "Odhlásit se"
                          : isFull
                          ? "Obsazeno"
                          : "Přihlásit se"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Pouze schválení</span>
                    )}
                  </div>
                </div>

                {event.isRegistered && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <span>✓</span> Jste přihlášeni
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
