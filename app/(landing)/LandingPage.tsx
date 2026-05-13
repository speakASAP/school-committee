"use client";

import { useState, useEffect, useRef } from "react";
import { voiceRecordingService } from "./voiceRecording";
import SiteHeader from "@/components/SiteHeader";

type Lang = "cs" | "en";

const T = {
  cs: {
    navTitle: "Školní výbor",
    login: "Přihlásit se",
    heroTitle: "Buďte součástí školního výboru",
    heroSubtitle:
      "Přispívejte finančně nebo svým časem, sledujte, jak se příspěvky využívají, a zapojte se do dobrovolnických akcí. Transparentně a jednoduše.",
    chips: [
      { label: "💳 QR platby", href: "/payments" },
      { label: "🕐 Dobrovolnictví", href: "/tasks" },
      { label: "📊 Transparentnost", href: "/report" },
      { label: "🔒 Bezpečně", href: "/gdpr" },
    ],
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
    moneyBtn: "Zaplatit příspěvek",
    timeTitle: "🕐 Příspěvek časem",
    timeDesc: "Přihlaste se na dobrovolnickou úlohu a pomozte škole svými schopnostmi.",
    timeBtn: "Nabídnout čas",
    examplesTitle: "Příklady dobrovolnických úloh",
    examples: [
      { icon: "🎨", title: "Malování třídy", desc: "Pomoc s renovací a výmalbou prostor školy.", slug: "malovani" },
      { icon: "🔧", title: "Drobné opravy", desc: "Oprava nábytku, dveří, drobné elektro.", slug: "opravy" },
      { icon: "🎉", title: "Organizace akcí", desc: "Příprava školních slavností a výletů.", slug: "akce" },
      { icon: "📚", title: "Doučování", desc: "Pomoc žákům s látkou ve vašem oboru.", slug: "doucovani" },
      { icon: "🌳", title: "Zahradničení", desc: "Úprava školní zahrady a výsadba.", slug: "zahradnictvi" },
      { icon: "🚗", title: "Odvoz na akce", desc: "Přeprava dětí na soutěže a výlety.", slug: "odvoz" },
    ],
    eventsTitle: "Školní akce",
    eventsSubtitle: "Nadcházející události ze ZŠ Střílky",
    eventsLoading: "Načítám akce…",
    eventsEmpty: "Momentálně žádné nadcházející akce.",
    eventsLink: "Zobrazit vše na webu školy",
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
    voiceNoTranscript: "⚠️ Váš prohlížeč nepodporuje převod řeči na text — zpráva nebyla zaznamenána. Napište ji prosím ručně.",
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
    gdprLinkText: "Zásady ochrany osobních údajů",
    footerCopy: (year: number) => `© ${year} Školní výbor · school-committee.alfares.cz`,
    footerLinks: [
      { label: "QR příspěvky", href: "/payments" },
      { label: "Dobrovolnictví", href: "/tasks" },
      { label: "Transparentnost", href: "/report" },
      { label: "GDPR", href: "/gdpr" },
    ],
    errorRequired: "Vyplňte prosím jméno a kontakt.",
    errorFailed: "Odeslání se nezdařilo. Zkuste to prosím znovu.",
    alreadyRegisteredNotice: "Tento e-mail je již registrován.",
    loginWithPassword: "Přihlásit se heslem",
    sendMagicLink: "Zaslat přihlašovací odkaz",
    magicLinkSent: "Odkaz byl odeslán na váš e-mail.",
    magicLinkFailed: "Nepodařilo se odeslat odkaz. Zkuste to znovu.",
  },
  en: {
    navTitle: "School Committee",
    login: "Sign in",
    heroTitle: "Be part of the school committee",
    heroSubtitle:
      "Contribute financially or with your time, track how contributions are used, and join volunteer tasks. Transparently and simply.",
    chips: [
      { label: "💳 QR Payments", href: "/payments" },
      { label: "🕐 Volunteering", href: "/tasks" },
      { label: "📊 Transparency", href: "/report" },
      { label: "🔒 Secure", href: "/gdpr" },
    ],
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
    moneyBtn: "Make a payment",
    timeTitle: "🕐 Time contribution",
    timeDesc: "Sign up for a volunteer task and help the school with your skills.",
    timeBtn: "Volunteer time",
    examplesTitle: "Example volunteer tasks",
    examples: [
      { icon: "🎨", title: "Classroom painting", desc: "Help renovate and paint school spaces.", slug: "malovani" },
      { icon: "🔧", title: "Minor repairs", desc: "Fix furniture, doors, basic electrical.", slug: "opravy" },
      { icon: "🎉", title: "Event organising", desc: "Help prepare school celebrations and trips.", slug: "akce" },
      { icon: "📚", title: "Tutoring", desc: "Help students with subjects in your field.", slug: "doucovani" },
      { icon: "🌳", title: "Gardening", desc: "Maintain the school garden and plant greenery.", slug: "zahradnictvi" },
      { icon: "🚗", title: "Transport", desc: "Drive children to competitions and trips.", slug: "odvoz" },
    ],
    eventsTitle: "School Events",
    eventsSubtitle: "Upcoming events from ZŠ Střílky",
    eventsLoading: "Loading events…",
    eventsEmpty: "No upcoming events at the moment.",
    eventsLink: "View all on school website",
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
    voiceNoTranscript: "⚠️ Your browser doesn't support speech-to-text — the message was not captured. Please type it manually.",
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
    gdprLinkText: "Privacy Policy",
    footerCopy: (year: number) => `© ${year} School Committee · school-committee.alfares.cz`,
    footerLinks: [
      { label: "QR Payments", href: "/payments" },
      { label: "Volunteering", href: "/tasks" },
      { label: "Transparency", href: "/report" },
      { label: "GDPR", href: "/gdpr" },
    ],
    errorRequired: "Please fill in your name and contact.",
    errorFailed: "Submission failed. Please try again.",
    alreadyRegisteredNotice: "This email is already registered.",
    loginWithPassword: "Sign in with password",
    sendMagicLink: "Send login link",
    magicLinkSent: "A login link has been sent to your email.",
    magicLinkFailed: "Failed to send the link. Please try again.",
  },
} as const;

type ContactType = "email";

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
  const [transcriptFailed, setTranscriptFailed] = useState(false);
  const [voiceHidden, setVoiceHidden] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(2025);
  const [emailCheckStatus, setEmailCheckStatus] = useState<"idle" | "checking" | "exists" | "not-found" | "error">("idle");
  const [magicLinkSentStatus, setMagicLinkSentStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const lastCheckedEmail = useRef("");
  const [schoolEvents, setSchoolEvents] = useState<{ title: string; date: string; url: string }[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    fetch("/api/public/school-events")
      .then((r) => r.json())
      .then((d) => setSchoolEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
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
      setLiveTranscript("");
      const base = preRecordMessageRef.current;
      if (transcript) {
        setTranscriptFailed(false);
        setVoiceBlob(blob);
        setMessage(base.trim() ? `${base.trim()}\n\n${transcript}` : transcript);
      } else {
        setTranscriptFailed(true);
        setVoiceBlob(null);
        setMessage(base);
      }
    } else {
      try {
        setTranscriptFailed(false);
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

  const handleEmailBlur = async () => {
    const email = contactValue.trim();
    if (contactType !== "email" || !email.includes("@") || email === lastCheckedEmail.current) return;
    lastCheckedEmail.current = email;
    setEmailCheckStatus("checking");
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = (await res.json()) as { exists?: boolean };
      setEmailCheckStatus(data.exists ? "exists" : "not-found");
    } catch {
      setEmailCheckStatus("error");
    }
  };

  const sendMagicLink = async () => {
    setMagicLinkSentStatus("sending");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contactValue.trim() }),
      });
      setMagicLinkSentStatus(res.ok ? "sent" : "error");
    } catch {
      setMagicLinkSentStatus("error");
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

  const successMsg = t.successEmail;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />

      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            {t.heroTitle}
          </h1>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">{t.heroSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {t.chips.map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="bg-white text-gray-700 border border-gray-200 rounded-full px-4 py-1 text-sm font-medium shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                {c.label}
              </a>
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
              { n: "1", title: t.step1Title, desc: t.step1Desc, href: "/login" },
              { n: "2", title: t.step2Title, desc: t.step2Desc, href: "/tasks" },
              { n: "3", title: t.step3Title, desc: t.step3Desc, href: "/report" },
            ].map(({ n, title, desc, href }) => (
              <a key={n} href={href} className="flex flex-col items-center text-center gap-3 group hover:opacity-90 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {n}
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </a>
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
            <a href="/payments" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all block">
              <h3 className="font-bold text-lg mb-2">{t.moneyTitle}</h3>
              <p className="text-gray-500 text-sm mb-4">{t.moneyDesc}</p>
              <span className="inline-block bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors">{t.moneyBtn}</span>
            </a>
            <a href="/tasks" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all block">
              <h3 className="font-bold text-lg mb-2">{t.timeTitle}</h3>
              <p className="text-gray-500 text-sm mb-4">{t.timeDesc}</p>
              <span className="inline-block bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors">{t.timeBtn}</span>
            </a>
          </div>

          <h3 className="text-lg font-semibold text-center mb-6">{t.examplesTitle}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {t.examples.map((ex) => (
              <a
                key={ex.slug}
                href={`/tasks#${ex.slug}`}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <span className="text-2xl">{ex.icon}</span>
                <span className="font-medium text-sm text-gray-800">{ex.title}</span>
                <span className="text-xs text-gray-500">{ex.desc}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE FORM */}
      <section ref={formRef} className="px-4 py-14 bg-gray-50">
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
                className="w-full border-2 border-gray-300 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <textarea
                rows={4}
                placeholder={t.messagePlaceholder}
                value={message}
                onChange={(e) => !isRecording && setMessage(e.target.value)}
                readOnly={isRecording}
                className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${
                  isRecording
                    ? "border-red-300 bg-red-50 focus:ring-red-400 text-gray-700"
                    : "border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500"
                }`}
              />

              {!voiceHidden && <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {transcriptFailed ? (
                    <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex-1">
                      <span className="flex-1">{t.voiceNoTranscript}</span>
                      <button
                        type="button"
                        onClick={() => { setTranscriptFailed(false); setVoiceHidden(true); }}
                        className="ml-2 text-xs text-amber-700 hover:text-amber-900 shrink-0"
                      >
                        {t.voiceRemove}
                      </button>
                    </div>
                  ) : voiceBlob ? (
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
                          : "bg-white border-gray-300 border-2 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {isRecording
                        ? `${t.voiceStop} (${formatTime(recordingTime)})`
                        : t.voiceStart}
                    </button>
                  )}
                </div>
              </div>}

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t.contactTypeLabel}</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder={t.contactValuePlaceholders[contactType]}
                    value={contactValue}
                    onChange={(e) => {
                      setContactValue(e.target.value);
                      if (emailCheckStatus !== "idle") {
                        setEmailCheckStatus("idle");
                        setMagicLinkSentStatus("idle");
                      }
                    }}
                    onBlur={handleEmailBlur}
                    className="w-full border-2 border-gray-300 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {emailCheckStatus === "checking" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">⏳</span>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {emailCheckStatus === "exists" ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-blue-800">{t.alreadyRegisteredNotice}</p>
                  {magicLinkSentStatus === "sent" ? (
                    <p className="text-sm text-green-700">{t.magicLinkSent}</p>
                  ) : magicLinkSentStatus === "error" ? (
                    <p className="text-sm text-red-600">{t.magicLinkFailed}</p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={`/login?email=${encodeURIComponent(contactValue.trim())}`}
                        className="flex-1 text-center bg-blue-600 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-blue-700 transition-colors"
                      >
                        {t.loginWithPassword}
                      </a>
                      <button
                        type="button"
                        onClick={sendMagicLink}
                        disabled={magicLinkSentStatus === "sending"}
                        className="flex-1 bg-white border border-blue-300 text-blue-700 font-semibold rounded-xl py-2.5 text-sm hover:bg-blue-50 disabled:opacity-50 transition-colors"
                      >
                        {magicLinkSentStatus === "sending" ? "Odesílám…" : t.sendMagicLink}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? t.submitting : t.submit}
                </button>
              )}

              <p className="text-xs text-gray-400 text-center">
                🔒 {lang === "cs" ? "Vaše data jsou chráněna dle" : "Your data is protected under"}{" "}
                <a href="/gdpr" className="underline hover:text-gray-600">{t.gdprLinkText}</a>.{" "}
                {lang === "cs" ? "Informace nepředáváme třetím stranám." : "We do not share it with third parties."}
              </p>
            </form>
          )}
        </div>
      </section>

      {/* SCHOOL EVENTS */}
      <section className="px-4 py-14 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">{t.eventsTitle}</h2>
          <p className="text-gray-500 text-center mb-8 text-sm">{t.eventsSubtitle}</p>
          {eventsLoading ? (
            <p className="text-sm text-gray-400 text-center">{t.eventsLoading}</p>
          ) : schoolEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">{t.eventsEmpty}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {schoolEvents.map((ev, i) => (
                <a
                  key={i}
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1 hover:shadow-md hover:border-blue-200 transition-all"
                >
                  <span className="text-2xl">📅</span>
                  <span className="font-medium text-sm text-gray-800">{ev.title}</span>
                  {ev.date && <span className="text-xs text-gray-500">{ev.date}</span>}
                </a>
              ))}
            </div>
          )}
          <div className="text-center">
            <a
              href="https://www.zsstrilky.cz/zakladni-skola/nadchazejici-udalosti"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {t.eventsLink} →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-100 px-4 py-8 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            {t.footerLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400">{t.footerCopy(year)}</p>
        </div>
      </footer>
    </div>
  );
}
