"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  schoolYear: string;
}

interface Child {
  id?: string;
  firstName: string;
  lastName: string;
  classId: string;
  notes: string;
  className?: string;
  grade?: string;
}

interface Profile {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  language: string;
  participationType: string;
  approvalStatus: string;
  rejectionReason: string | null;
  schoolId: string;
  tenantId: string;
}

interface Me {
  id: string;
  email: string;
  roles: string[];
  approvalStatus: string;
  rejectionReason: string | null;
}

const PARTICIPATION_LABELS: Record<string, string> = {
  financial: "Finanční příspěvek",
  labor: "Dobrovolnická práce",
  mixed: "Obojí",
};

const LANGUAGE_LABELS: Record<string, string> = {
  cs: "Čeština",
  en: "English",
  ru: "Русский",
  uk: "Українська",
};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "", language: "cs", participationType: "financial" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Children edit state
  const [editingChildren, setEditingChildren] = useState(false);
  const [childrenForm, setChildrenForm] = useState<Child[]>([]);
  const [childrenSaving, setChildrenSaving] = useState(false);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [childrenSuccess, setChildrenSuccess] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Role upgrade state
  const [showRoleUpgrade, setShowRoleUpgrade] = useState(false);
  const [upgradeRole, setUpgradeRole] = useState<"teacher" | "school_staff">("teacher");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeSaving, setUpgradeSaving] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, profileRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/profile"),
      ]);
      const meData = await meRes.json();
      setMe(meData.user ?? null);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
        setChildren(profileData.children ?? []);
        setProfileForm({
          firstName: profileData.profile.firstName,
          lastName: profileData.profile.lastName,
          phone: profileData.profile.phone ?? "",
          language: profileData.profile.language,
          participationType: profileData.profile.participationType,
        });

        // Fetch classes for children editing
        const classRes = await fetch(`/api/public/classes?schoolId=${profileData.profile.schoolId}`);
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(classData.classes ?? []);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isParent = me?.roles.includes("parent") ?? false;
  const isApproved = profile?.approvalStatus === "approved";
  const isPending = profile?.approvalStatus === "pending";
  const isRejected = profile?.approvalStatus === "rejected";
  const canRequestUpgrade = isApproved && !me?.roles.includes("teacher") && !me?.roles.includes("school_staff") && !me?.roles.includes("admin");

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error?.message ?? "Uložení selhalo");
      } else {
        setProfile((p) => p ? { ...p, ...data.profile } : p);
        setEditingProfile(false);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch {
      setProfileError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setProfileSaving(false);
    }
  }

  function startEditChildren() {
    setChildrenForm(children.map((c) => ({ ...c, notes: c.notes ?? "" })));
    setChildrenError(null);
    setChildrenSuccess(false);
    setEditingChildren(true);
  }

  function addChild() {
    setChildrenForm((f) => [...f, { firstName: "", lastName: "", classId: classes[0]?.id ?? "", notes: "" }]);
  }

  function removeChild(i: number) {
    setChildrenForm((f) => f.filter((_, idx) => idx !== i));
  }

  function updateChild(i: number, field: keyof Child, value: string) {
    setChildrenForm((f) => f.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  async function saveChildren() {
    setChildrenSaving(true);
    setChildrenError(null);
    setChildrenSuccess(false);
    try {
      const res = await fetch("/api/profile/children", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ children: childrenForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChildrenError(data.error?.message ?? "Uložení selhalo");
      } else {
        await loadData();
        setEditingChildren(false);
        setChildrenSuccess(true);
        setTimeout(() => setChildrenSuccess(false), 3000);
      }
    } catch {
      setChildrenError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setChildrenSaving(false);
    }
  }

  async function changePassword() {
    if (password !== passwordConfirm) {
      setPasswordError("Hesla se neshodují");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Heslo musí mít alespoň 6 znaků");
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPasswordError(data.error?.message ?? "Změna hesla selhala");
      } else {
        setPasswordSuccess(true);
        setPassword("");
        setPasswordConfirm("");
        setShowPasswordForm(false);
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch {
      setPasswordError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function requestRoleUpgrade() {
    setUpgradeSaving(true);
    setUpgradeError(null);
    setUpgradeSuccess(false);
    try {
      const res = await fetch("/api/profile/role-upgrade-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedRole: upgradeRole, reason: upgradeReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpgradeError(data.error?.message ?? "Žádost selhala");
      } else {
        setShowRoleUpgrade(false);
        setUpgradeSuccess(true);
        setUpgradeReason("");
        setTimeout(() => setUpgradeSuccess(false), 5000);
      }
    } catch {
      setUpgradeError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setUpgradeSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Můj profil</h1>
        {me && <p className="text-sm text-gray-500 mt-1">{me.email}</p>}
        {me?.roles && me.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {me.roles.map((r) => (
              <span key={r} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r}</span>
            ))}
          </div>
        )}
      </div>

      {/* Approval status banner */}
      {isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="font-semibold text-yellow-800">Váš účet čeká na schválení</p>
            <p className="text-sm text-yellow-700 mt-0.5">Správce školy váš účet brzy zkontroluje. Mezitím si můžete prohlížet obsah, ale nemůžete provádět akce.</p>
          </div>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className="font-semibold text-red-800">Registrace nebyla schválena</p>
            {profile?.rejectionReason && (
              <p className="text-sm text-red-700 mt-0.5">Důvod: {profile.rejectionReason}</p>
            )}
            <p className="text-sm text-red-600 mt-1">Upravte svůj profil níže a znovu jej odešlete ke schválení.</p>
          </div>
        </div>
      )}

      {/* Profile info / edit */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Osobní údaje</h2>
          {!editingProfile && (
            <button
              onClick={() => { setEditingProfile(true); setProfileError(null); setProfileSuccess(false); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Upravit
            </button>
          )}
        </div>

        {profileSuccess && (
          <p className="text-green-600 text-sm">Profil byl uložen.{isRejected ? " Byl odeslán ke schválení." : ""}</p>
        )}

        {editingProfile ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jméno *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Příjmení *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+420 …"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jazyk</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={profileForm.language}
                onChange={(e) => setProfileForm((f) => ({ ...f, language: e.target.value }))}
              >
                {Object.entries(LANGUAGE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Způsob účasti</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={profileForm.participationType}
                onChange={(e) => setProfileForm((f) => ({ ...f, participationType: e.target.value }))}
              >
                {Object.entries(PARTICIPATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {profileError && <p className="text-red-600 text-sm">{profileError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {profileSaving ? "Ukládám…" : isRejected ? "Uložit a znovu odeslat" : "Uložit"}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Zrušit
              </button>
            </div>
          </div>
        ) : (
          profile && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Jméno</dt>
              <dd className="font-medium text-gray-900">{profile.firstName} {profile.lastName}</dd>
              <dt className="text-gray-500">Telefon</dt>
              <dd className="font-medium text-gray-900">{profile.phone ?? "—"}</dd>
              <dt className="text-gray-500">Jazyk</dt>
              <dd className="font-medium text-gray-900">{LANGUAGE_LABELS[profile.language] ?? profile.language}</dd>
              <dt className="text-gray-500">Způsob účasti</dt>
              <dd className="font-medium text-gray-900">{PARTICIPATION_LABELS[profile.participationType] ?? profile.participationType}</dd>
            </dl>
          )
        )}
      </div>

      {/* Children section — visible to all, required for parents */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Děti ve škole</h2>
          {!editingChildren && (
            <button
              onClick={startEditChildren}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {children.length === 0 ? "Přidat" : "Upravit"}
            </button>
          )}
        </div>

        {childrenSuccess && <p className="text-green-600 text-sm">Děti byly uloženy.</p>}

        {editingChildren ? (
          <div className="space-y-4">
            {childrenForm.map((child, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Dítě {i + 1}</span>
                  {childrenForm.length > 1 && (
                    <button
                      onClick={() => removeChild(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Odebrat
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jméno *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={child.firstName}
                      onChange={(e) => updateChild(i, "firstName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Příjmení *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={child.lastName}
                      onChange={(e) => updateChild(i, "lastName", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Třída *</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={child.classId}
                    onChange={(e) => updateChild(i, "classId", e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.grade} {c.name} ({c.schoolYear})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Poznámka</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={child.notes}
                    onChange={(e) => updateChild(i, "notes", e.target.value)}
                    placeholder="Volitelně…"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addChild}
              className="w-full border border-dashed border-blue-300 rounded-xl py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              + Přidat další dítě
            </button>
            {childrenError && <p className="text-red-600 text-sm">{childrenError}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveChildren}
                disabled={childrenSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {childrenSaving ? "Ukládám…" : "Uložit"}
              </button>
              <button
                onClick={() => setEditingChildren(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Zrušit
              </button>
            </div>
          </div>
        ) : children.length > 0 ? (
          <ul className="space-y-2">
            {children.map((child, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {child.firstName[0]}
                </span>
                <span className="font-medium text-gray-900">{child.firstName} {child.lastName}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{child.grade} {child.className}</span>
                {child.notes && <span className="text-gray-400 italic">({child.notes})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">Žádné děti zatím nebyly přidány.{isParent ? " Přidejte alespoň jedno dítě." : ""}</p>
        )}
      </div>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Heslo</h2>
          {!showPasswordForm && (
            <button
              onClick={() => { setShowPasswordForm(true); setPasswordError(null); setPasswordSuccess(false); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Změnit heslo
            </button>
          )}
        </div>

        {passwordSuccess && <p className="text-green-600 text-sm">Heslo bylo změněno.</p>}

        {showPasswordForm && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nové heslo</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Alespoň 6 znaků"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Potvrdit heslo</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
            {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
            <div className="flex gap-2">
              <button
                onClick={changePassword}
                disabled={passwordSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {passwordSaving ? "Ukládám…" : "Uložit heslo"}
              </button>
              <button
                onClick={() => setShowPasswordForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}

        {!showPasswordForm && (
          <p className="text-sm text-gray-400">Nastavte si heslo jako alternativu k přihlašovacímu odkazu.</p>
        )}
      </div>

      {/* Role upgrade request */}
      {canRequestUpgrade && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Změna role</h2>

          {upgradeSuccess && (
            <p className="text-green-600 text-sm">Žádost o změnu role byla odeslána. Správce ji brzy posoudí.</p>
          )}

          {!showRoleUpgrade && !upgradeSuccess && (
            <>
              <p className="text-sm text-gray-500">Jste učitel nebo člen vedení školy? Požádejte o přidělení příslušné role.</p>
              <button
                onClick={() => { setShowRoleUpgrade(true); setUpgradeError(null); }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Požádat o změnu role →
              </button>
            </>
          )}

          {showRoleUpgrade && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Požadovaná role</label>
                <div className="flex gap-3">
                  {(["teacher", "school_staff"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="upgradeRole"
                        value={r}
                        checked={upgradeRole === r}
                        onChange={() => setUpgradeRole(r)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{r === "teacher" ? "Učitel" : "Vedení školy"}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Zdůvodnění (volitelně)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={2}
                  value={upgradeReason}
                  onChange={(e) => setUpgradeReason(e.target.value)}
                  placeholder="Proč žádáte o tuto roli?"
                />
              </div>
              {upgradeError && <p className="text-red-600 text-sm">{upgradeError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={requestRoleUpgrade}
                  disabled={upgradeSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {upgradeSaving ? "Odesílám…" : "Odeslat žádost"}
                </button>
                <button
                  onClick={() => setShowRoleUpgrade(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Další akce</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link
            href="/tasks"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
          >
            ✅ Dobrovolnické úkoly
          </Link>
          <Link
            href="/payments"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
          >
            💳 Platby
          </Link>
          <Link
            href="/feedback"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
          >
            💬 Zpětná vazba
          </Link>
          <Link
            href="/report"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700"
          >
            📊 Transparentnost
          </Link>
        </div>
      </div>

      {/* Danger zone */}
      <div className="text-center pt-2">
        <Link href="/account/delete" className="text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors">
          Žádost o smazání účtu (GDPR)
        </Link>
      </div>
    </div>
  );
}
