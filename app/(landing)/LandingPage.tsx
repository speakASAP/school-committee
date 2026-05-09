"use client";

import { useState, useEffect, useRef } from "react";
import { voiceRecordingService } from "./voiceRecording";

type Lang = "cs" | "en";

const T = {
  cs: {
    navTitle: "Školní výbor",
    login: "Přihlásit se",
    heroTitle: "Buďte součástí školního výboru",
    heroSubtitle:
      "Přispívejte finančně nebo svým časem, sledujte, jak se příspěvky využívají, a zapojte se do dobrovolnických akcí. Transparentně a jednoduše.",
    chip1: "💳 QR platby",
    chip2: "🕐 Dobrovolnictví",
    chip3: "📊 Transparentnost",
    chip4: "🔒 Bezpečně",
    ctaScroll: "Chci se zapojit →",
    howTitle: "Jak to funguje",
    step1Title: "Zaregistrujte se",
    step1Desc: "Vyplňte jednoduchý formulář a vyberte, jak chcete přispívat — penězi nebo časem.",
    step2Title: "Přispějte nebo se přihlaste",
    step2Desc: "Zaplaťte přes QR kód nebo si vyberte dobrovolnickou úlohu z nabídky.",
    step3Title: "Sledujte výsledky",
    step3Desc: "Transparentní přehled příjmů, výdajů a splněných úkolů — vždy dostupný online.",
    contributeTitle: "Peníze nebo čas — záleží na vás",
    contributeSubtitle:
      "Výbor rozumí, že ne každý může přispívat finančně. Proto nabízíme také dobrovolnické úlohy — drobné práce, které mají velký dopad.",
    moneyTitle: "💳 Finanční příspěvek",
    moneyDesc:
      "Jednorázová nebo pravidelná platba přes QR kód na český bankovní účet. Žádné složité formuláře, žádné karty.",
    timeTitle: "🕐 Příspěvek časem",
    timeDesc: "Přihlaste se na dobrovolnickou úlohu a pomozte škole svými schopnostmi.",
    examplesTitle: "Příklady dobrovolnických úloh",
    examples: [
      { icon: "🎨", title: "Malování třídy", desc: "Pomoc s renovací a výmalbou prostor školy." },
      { icon: "🔧", title: "Drobné opravy", desc: "Oprava nábytku, dveří, drobné elektro." },
      { icon: "🎉", title: "Organizace akcí", desc: "Příprava školních slavností a výletů." },
      { icon: "📚", title: "Doučování", desc: "Pomoc žákům s látkou ve vašem oboru." },
      { icon: "🌳", title: "Zahradničení", desc: "Úprava školní zahrady a výsadba." },
      { icon: "🚗", title: "Odvoz na akce", desc: "Přeprava dětí na soutěže a výlety." },
    ],
    formTitle: "Chci se zapojit",
    formSubtitle: "Zanechte nám zprávu — ozveme se vám a pomůžeme s registrací.",
    namePlaceholder: "Vaše jméno",
    messagePlaceholder:
      "Napište nám cokoliv — jak se chcete zapojit, co umíte, nebo se jen přihlaste zájem. Nepovinné.",
    contactTypeLabel: "Jak vás kontaktovat",
    contactValuePlaceholders: {
      email: "vas@email.cz",
      whatsapp: "+420 777 123 456",
      telegram: "@vase_jmeno",
      phone: "+420 777 123 456",
    },
    voiceStart: "🎤 Nahrát hlasovou zprávu",
    voiceStop: "⏹️ Zastavit nahrávání",
    voiceRecorded: "✅ Hlasová zpráva připravena",
    voiceRemove: "Smazat",
    submit: "Odeslat zájem",
    submitting: "Odesílám…",
    successTitle: "Děkujeme! 🎉",
    successEmail:
      "Pošleme vám potvrzovací e-mail. Klikněte na odkaz v e-mailu pro dokončení registrace.",
    successWhatsapp:
      "Pošleme vám zprávu na WhatsApp. Odpovězte na ni pro dokončení registrace.",
    successTelegram:
      "Pošleme vám zprávu na Telegram. Odpovězte na ni pro dokončení registrace.",
    successPhone:
      "Zavolám vám co nejdříve. Děkujeme za zájem!",
    gdpr: "🔒 Vaše data jsou chráněna dle GDPR. Informace nepředáváme třetím stranám.",
    footerCopy: (year: number) => `© ${year} Školní výbor · school-committee.alfares.cz`,
    errorRequired: "Vyplňte prosím jméno a kontakt.",
    errorFailed: "Odeslání se nezdařilo. Zkuste to prosím znovu.",
  },
  en: {
    navTitle: "School Committee",
    login: "Sign in",
    heroTitle: "Be part of the school committee",
    heroSubtitle:
      "Contribute financially or with your time, track how contributions are used, and join volunteer tasks. Transparently and simply.",
    chip1: "💳 QR Payments",
    chip2: "🕐 Volunteering",
    chip3: "📊 Transparency",
    chip4: "🔒 Secure",
    ctaScroll: "I want to join →",
    howTitle: "How it works",
    step1Title: "Register",
    step1Desc: "Fill in a simple form and choose how you want to contribute — money or time.",
    step2Title: "Contribute or volunteer",
    step2Desc: "Pay via QR code or pick a volunteer task from the list.",
    step3Title: "Track results",
    step3Desc:
      "Transparent overview of income, expenses and completed tasks — always available online.",
    contributeTitle: "Money or time — your choice",
    contributeSubtitle:
      "We understand not everyone can contribute financially. That's why we also offer volunteer tasks — small jobs with a big impact.",
    moneyTitle: "💳 Financial contribution",
    moneyDesc:
      "One-time or recurring payment via QR code to a Czech bank account. No complex forms, no cards needed.",
    timeTitle: "🕐 Time contribution",
    timeDesc: "Sign up for a volunteer task and help the school with your skills.",
    examplesTitle: "Example volunteer tasks",
    examples: [
      { icon: "🎨", title: "Classroom painting", desc: "Help renovate and paint school spaces." },
      { icon: "🔧", title: "Minor repairs", desc: "Fix furniture, doors, basic electrical." },
      { icon: "🎉", title: "Event organising", desc: "Help prepare school celebrations and trips." },
      { icon: "📚", title: "Tutoring", desc: "Help students with subjects in your field." },
      { icon: "🌳", title: "Gardening", desc: "Maintain the school garden and plant greenery." },
      { icon: "🚗", title: "Transport", desc: "Drive children to competitions and trips." },
    ],
    formTitle: "I want to get involved",
    formSubtitle: "Leave us a message — we'll get back to you and help with registration.",
    namePlaceholder: "Your name",
    messagePlaceholder:
      "Tell us anything — how you'd like to contribute, what skills you have, or just express interest. Optional.",
    contactTypeLabel: "How to contact you",
    contactValuePlaceholders: {
      email: "you@email.com",
      whatsapp: "+420 777 123 456",
      telegram: "@your_handle",
      phone: "+420 777 123 456",
    },
    voiceStart: "🎤 Record voice message",
    voiceStop: "⏹️ Stop recording",
    voiceRecorded: "✅ Voice message ready",
    voiceRemove: "Remove",
    submit: "Send interest",
    submitting: "Sending…",
    successTitle: "Thank you! 🎉",
    successEmail:
      "We'll send you a confirmation email. Click the link in the email to complete registration.",
    successWhatsapp:
      "We'll send you a WhatsApp message. Reply to it to complete registration.",
    successTelegram:
      "We'll send you a Telegram message. Reply to it to complete registration.",
    successPhone:
      "We'll call you as soon as possible. Thank you for your interest!",
    gdpr: "🔒 Your data is protected under GDPR. We do not share it with third parties.",
    footerCopy: (year: number) => `© ${year} School Committee · school-committee.alfares.cz`,
    errorRequired: "Please fill in your name and contact.",
    errorFailed: "Submission failed. Please try again.",
  },
} as const;

type ContactType = "email" | "whatsapp" | "telegram" | "phone";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("cs");
  const t = T[lang];
  const formRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contactValue, setContactValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const preRecordMessageRef = useRef("");

  const toggleRecording = async () => {
    if (isRecording) {
      const { blob, transcript } = await voiceRecordingService.stopRecording();
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setVoiceBlob(blob);
      setLiveTranscript("");
      const base = preRecordMessageRef.current;
      if (transcript) {
        setMessage(base.trim() ? `${base.trim()}\n\n${transcript}` : transcript);
      } else {
        setMessage(base);
      }
    } else {
      try {
        preRecordMessageRef.current = message;
        await voiceRecordingService.startRecording((text) => {
          setLiveTranscript(text);
          const base = preRecordMessageRef.current;
          setMessage(base.trim() ? `${base.trim()}\n\n${text}` : text);
        });
        setIsRecording(true);
        setRecordingTime(0);
        setLiveTranscript("");
        intervalRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Nelze spustit nahrávání.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactValue.trim()) {
      setError(t.errorRequired);
      return;
    }
    setError(null);
    setSubmitting(true);

    const fullMessage = message.trim() || "Zájem o zapojení";

    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceService: "school-committee",
          sourceUrl: typeof window !== "undefined" ? window.location.href : "",
          sourceLabel: "landing-page",
          message: fullMessage,
          contactMethods: [{ type: contactType, value: contactValue.trim() }],
          metadata: {
            name,
            lang,
            hasVoice: !!voiceBlob,
            voiceSeconds: recordingTime,
            page: "landing",
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSubmitted(true);
    } catch {
      setError(t.errorFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const successMsg =
    contactType === "email"
      ? t.successEmail
      : contactType === "whatsapp"
        ? t.successWhatsapp
        : contactType === "telegram"
          ? t.successTelegram
          : t.successPhone;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-blue-700">{t.navTitle}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "cs" ? "en" : "cs")}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1"
          >
            {lang === "cs" ? "EN" : "CS"}
          </button>
          <a
            href="/login"
            className="text-sm font-medium bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            {t.login}
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            {t.heroTitle}
          </h1>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">{t.heroSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[t.chip1, t.chip2, t.chip3, t.chip4].map((c) => (
              <span
                key={c}
                className="bg-white text-gray-700 border border-gray-200 rounded-full px-4 py-1 text-sm font-medium shadow-sm"
              >
                {c}
              </span>
            ))}
          </div>
          <button
            onClick={scrollToForm}
            className="bg-blue-600 text-white font-semibold rounded-xl px-8 py-3 text-base hover:bg-blue-700 transition-colors shadow"
          >
            {t.ctaScroll}
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-14 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">{t.howTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "1", title: t.step1Title, desc: t.step1Desc },
              { n: "2", title: t.step2Title, desc: t.step2Desc },
              { n: "3", title: t.step3Title, desc: t.step3Desc },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {n}
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MONEY OR TIME */}
      <section className="px-4 py-14 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">{t.contributeTitle}</h2>
          <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
            {t.contributeSubtitle}
          </p>
          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-2">{t.moneyTitle}</h3>
              <p className="text-gray-500 text-sm">{t.moneyDesc}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-2">{t.timeTitle}</h3>
              <p className="text-gray-500 text-sm">{t.timeDesc}</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-center mb-6">{t.examplesTitle}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {t.examples.map((ex) => (
              <div
                key={ex.title}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1"
              >
                <span className="text-2xl">{ex.icon}</span>
                <span className="font-medium text-sm text-gray-800">{ex.title}</span>
                <span className="text-xs text-gray-500">{ex.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE FORM */}
      <section ref={formRef} className="px-4 py-14 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">{t.formTitle}</h2>
          <p className="text-gray-500 text-center mb-8 text-sm">{t.formSubtitle}</p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <p className="text-2xl mb-3">{t.successTitle}</p>
              <p className="text-gray-600 text-sm">{successMsg}</p>
              <a href="/login" className="mt-6 inline-block text-sm text-blue-600 underline">
                {t.login} →
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder={t.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                rows={4}
                placeholder={t.messagePlaceholder}
                value={message}
                onChange={(e) => !isRecording && setMessage(e.target.value)}
                readOnly={isRecording}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${
                  isRecording
                    ? "border-red-300 bg-red-50 focus:ring-red-400 text-gray-700"
                    : "border-gray-200 focus:ring-blue-500"
                }`}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {voiceBlob ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex-1">
                      <span>{t.voiceRecorded}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceBlob(null);
                          setRecordingTime(0);
                        }}
                        className="ml-auto text-xs text-red-500 hover:text-red-700"
                      >
                        {t.voiceRemove}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`flex-1 text-sm rounded-xl px-4 py-2 border transition-colors ${
                        isRecording
                          ? "bg-red-50 border-red-300 text-red-700"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {isRecording
                        ? `${t.voiceStop} (${formatTime(recordingTime)})`
                        : t.voiceStart}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t.contactTypeLabel}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {(["email", "whatsapp", "telegram", "phone"] as ContactType[]).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => {
                        setContactType(ct);
                        setContactValue("");
                      }}
                      className={`text-sm rounded-xl px-3 py-2 border transition-colors ${
                        contactType === ct
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {ct === "email"
                        ? "📧 Email"
                        : ct === "whatsapp"
                          ? "📱 WhatsApp"
                          : ct === "telegram"
                            ? "✈️ Telegram"
                            : "📞 Telefon"}
                    </button>
                  ))}
                </div>
                <input
                  type={contactType === "email" ? "email" : "tel"}
                  required
                  placeholder={t.contactValuePlaceholders[contactType]}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? t.submitting : t.submit}
              </button>

              <p className="text-xs text-gray-400 text-center">{t.gdpr}</p>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-400">
        {t.footerCopy(year)}
      </footer>
    </div>
  );
}
