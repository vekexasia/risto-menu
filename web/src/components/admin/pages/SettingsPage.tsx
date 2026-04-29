"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { updateRestaurantSettings, setMenuPublished, fetchRestaurantSettings } from "@/lib/api";
import { uploadHeaderImage, uploadPromotionalImage } from "@/lib/imageUpload";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useRestaurantStore } from "@/stores/restaurantStore";
import { locales } from "@/lib/i18n-config";

// ── Design tokens (mirrors admin.css) ────────────────────────────
const T = {
  dark: "#1F1A14",
  accent: "#C47A4F",
  accentDeep: "#A15E35",
  accentLight: "#F4E2D4",
  surface: "#FBFAF9",
  border: "#E7E5E4",
  ok: "#1F8E5A",
  okBg: "#E6F4EC",
  off: "#9A9590",
  offBg: "#F0EEEA",
  muted: "#888",
  text: "#424242",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  warn: "#92400E",
  warnBg: "#FEF3C7",
  warnBorder: "#FDE68A",
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  borderRadius: 6,
  border: `1px solid ${T.border}`,
  padding: "0 12px",
  fontSize: 13,
  background: "#fff",
  color: T.text,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 6,
  border: `1px solid ${T.border}`,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
  color: T.text,
  fontFamily: "inherit",
  resize: "vertical",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#666",
  marginBottom: 4,
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.off, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: on ? "#2563EB" : T.border,
        cursor: "pointer",
        transition: "background .2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute",
        left: on ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        transition: "left .2s",
      }} />
    </button>
  );
}

export type SettingsSection = "profile" | "languages" | "communications" | "chat-ai" | "publishing";

const SECTION_TITLES: Record<SettingsSection, string> = {
  profile: "Profilo",
  languages: "Lingue",
  communications: "Comunicazioni",
  "chat-ai": "Chat AI",
  publishing: "Pubblicazione",
};

export default function SettingsPage({ section }: { section?: SettingsSection } = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [published, setPublished] = useState<boolean | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [name, setName] = useState("");
  const [payoff, setPayoff] = useState("");
  const [headerImage, setHeaderImage] = useState("");

  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [region, setRegion] = useState("");

  const [menuNoticeEnabled, setMenuNoticeEnabled] = useState(true);
  const [menuNoticeText, setMenuNoticeText] = useState("* Avvisa sempre il personale di allergie e/o intolleranze alimentari.\n\n* Alcune pietanze potrebbero contenere ingredienti surgelati/congelati secondo la stagionalità del prodotto e le esigenze del mercato");
  const [menuNoticeI18n, setMenuNoticeI18n] = useState<Record<string, Record<string, string>>>({});
  const [menuNoticeTab, setMenuNoticeTab] = useState("it");

  const [promoTitle, setPromoTitle] = useState("");
  const [promoContent, setPromoContent] = useState("");
  const [promoUrl, setPromoUrl] = useState("");
  const [promoTillDate, setPromoTillDate] = useState("");

  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [chatAgentPrompt, setChatAgentPrompt] = useState("");
  const [aiChatEnabled, setAiChatEnabled] = useState(false);

  const STANDARD_NON_IT = locales.filter((l) => l !== "it" && l !== "vec") as string[];
  const { data: restaurantStoreData, loadRestaurant } = useRestaurantStore();
  const [enabledLocales, setEnabledLocales] = useState<string[]>(STANDARD_NON_IT);
  const [disabledLocales, setDisabledLocales] = useState<string[]>([]);
  const [customLocales, setCustomLocales] = useState<{ code: string; name: string }[]>([]);
  const [newLocaleCode, setNewLocaleCode] = useState("");
  const [newLocaleName, setNewLocaleName] = useState("");
  const [editingLocale, setEditingLocale] = useState<{ code: string; name: string } | null>(null);

  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const promoInputRef = useRef<HTMLInputElement>(null);

  // Populate form fields from the store (public catalog data)
  useEffect(() => {
    if (!restaurantStoreData) return;
    setName(restaurantStoreData.name || "");
    setPayoff(restaurantStoreData.payoff || "");
    setHeaderImage(restaurantStoreData.headerImage || "");
    setPhone(restaurantStoreData.info?.phone || "");
    setAddressLine1(restaurantStoreData.info?.addressLine1 || "");
    setCity(restaurantStoreData.info?.city || "");
    setZip(restaurantStoreData.info?.zip || "");
    setRegion(restaurantStoreData.info?.region || "");
    setMenuNoticeEnabled(restaurantStoreData.info?.menuNotice?.enabled !== false);
    if (restaurantStoreData.info?.menuNotice?.text) setMenuNoticeText(restaurantStoreData.info.menuNotice.text);
    setMenuNoticeI18n((restaurantStoreData.info?.menuNotice?.i18n as Record<string, Record<string, string>>) || {});
    setFacebook(restaurantStoreData.socials?.facebook || "");
    setInstagram(restaurantStoreData.socials?.instagram || "");
    setWhatsapp(restaurantStoreData.socials?.whatsapp || "");
    if (restaurantStoreData.features?.enabledLocales != null) {
      setEnabledLocales(restaurantStoreData.features.enabledLocales);
    }
    if (restaurantStoreData.features?.disabledLocales != null) {
      setDisabledLocales(restaurantStoreData.features.disabledLocales);
    }
    if (restaurantStoreData.features?.customLocales != null) {
      setCustomLocales(restaurantStoreData.features.customLocales);
    }
  }, [restaurantStoreData]);

  // Load private settings (chatAgentPrompt, aiChatEnabled, promotionAlert) from admin API
  useEffect(() => {
    async function loadPrivateSettings() {
      try {
        const settings = await fetchRestaurantSettings();
        setChatAgentPrompt(settings.chatAgentPrompt || "");
        setAiChatEnabled(settings.aiChatEnabled ?? false);
        setPublished(settings.publicationState === "published");
        if (settings.enabledLocales != null) setEnabledLocales(settings.enabledLocales);
        if (settings.disabledLocales) setDisabledLocales(settings.disabledLocales);
        if (settings.customLocales) setCustomLocales(settings.customLocales);
        const promo = settings.promotionAlert as Record<string, string> | null;
        if (promo) {
          setPromoTitle(promo.title || "");
          setPromoContent(promo.content || "");
          setPromoUrl(promo.url || "");
          if (promo.tillDate) {
            const date = new Date(promo.tillDate);
            setPromoTillDate(date.toISOString().split("T")[0]);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Errore nel caricamento dei dati");
        setLoading(false);
      }
    }

    loadPrivateSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let tillDateISO = "";
      if (promoTillDate) {
        const date = new Date(promoTillDate);
        date.setHours(23, 59, 59, 999);
        tillDateISO = date.toISOString();
      }

      const payload = {
        name,
        payoff,
        info: {
          phone,
          addressLine1,
          city,
          zip,
          region,
          headerImage,
          menuNotice: {
            enabled: menuNoticeEnabled,
            text: menuNoticeText,
            i18n: menuNoticeI18n,
          },
        },
        promotionAlert: { title: promoTitle, content: promoContent, url: promoUrl, tillDate: tillDateISO },
        socials: { facebook, instagram, whatsapp },
        chatAgentPrompt,
        aiChatEnabled,
        enabledLocales,
        disabledLocales,
        customLocales,
      };

      await updateRestaurantSettings(payload);
      await loadRestaurant({ force: true });

      setSuccess("Salvato con successo!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving:", err);
      setError("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleHeaderImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeader(true);
    setError(null);
    try {
      const imageUrl = await uploadHeaderImage(file);
      setHeaderImage(imageUrl);
      await loadRestaurant({ force: true });
      setSuccess("Immagine header aggiornata!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento dell'immagine");
    } finally {
      setUploadingHeader(false);
      if (headerInputRef.current) headerInputRef.current.value = "";
    }
  };

  const handlePromoImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPromo(true);
    setError(null);
    try {
      const imageUrl = await uploadPromotionalImage(file);
      setPromoUrl(`${imageUrl}?t=${Date.now()}`);
      setSuccess("Immagine promozionale aggiornata!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento dell'immagine");
    } finally {
      setUploadingPromo(false);
      if (promoInputRef.current) promoInputRef.current.value = "";
    }
  };

  const handlePublishToggle = async () => {
    setPublishing(true);
    setError(null);
    try {
      const next = !published;
      await setMenuPublished(next);
      setPublished(next);
      setSuccess(next ? "Menu pubblicato!" : "Menu nascosto.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Errore nella pubblicazione");
    } finally {
      setPublishing(false);
    }
  };

  const show = (s: SettingsSection) => !section || section === s;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: T.off, fontSize: 13 }}>Caricamento impostazioni...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>
      <main className="adm-scroll" style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "20px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accentDeep, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <span>Impostazioni</span>
            {section && (
              <>
                <span style={{ opacity: 0.4 }}>›</span>
                <span style={{ color: T.muted }}>{SECTION_TITLES[section]}</span>
              </>
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.dark, margin: 0 }}>
            {section ? SECTION_TITLES[section] : "Impostazioni Ristorante"}
          </h1>
        </div>

        {/* Toast messages */}
        {success && (
          <div style={{ background: T.okBg, border: `1px solid #BBF7D0`, borderRadius: 6, padding: "10px 14px", color: T.ok, fontSize: 13, marginBottom: 16 }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ background: T.dangerBg, border: "1px solid #FECACA", borderRadius: 6, padding: "10px 14px", color: T.danger, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ maxWidth: section ? 720 : 1200 }}>

          {/* ── 2-column grid (single column when a sub-section is selected) ── */}
          <div style={{ display: section ? "block" : "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* ── LEFT column ── */}
            <div>
              {show("profile") && <>
              {/* ── Informazioni Base ── */}
              <Card title="Informazioni Base">
                <Field label="Nome Ristorante">
                  <input className="adm-input" style={inputStyle} type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Payoff / Slogan">
                  <input className="adm-input" style={inputStyle} type="text" value={payoff} onChange={(e) => setPayoff(e.target.value)} placeholder="es. La tradizione del gusto" />
                </Field>
              </Card>

              {/* ── Immagine Header ── */}
              <Card title="Immagine Header">
                {headerImage ? (
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", borderRadius: 6, overflow: "hidden", background: T.border }}>
                    <Image src={headerImage} alt="Header" fill style={{ objectFit: "cover" }} unoptimized />
                    <button
                      type="button"
                      onClick={() => headerInputRef.current?.click()}
                      disabled={uploadingHeader}
                      style={{ position: "absolute", bottom: 8, right: 8, background: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }}
                      title="Cambia immagine"
                    >
                      <i className="fa-solid fa-pen" style={{ fontSize: 12, color: T.text }} />
                    </button>
                    {uploadingHeader && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 13 }}>Caricamento...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => headerInputRef.current?.click()}
                    disabled={uploadingHeader}
                    style={{ width: "100%", aspectRatio: "16/7", borderRadius: 6, border: `2px dashed ${T.border}`, background: T.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: T.off, fontSize: 13 }}
                  >
                    <i className="fa-solid fa-image" style={{ fontSize: 24, opacity: 0.4 }} />
                    <span>{uploadingHeader ? "Caricamento..." : "Clicca per caricare un'immagine"}</span>
                  </button>
                )}
                <input ref={headerInputRef} type="file" accept="image/*" onChange={handleHeaderImageChange} style={{ display: "none" }} />
              </Card>

              {/* ── Contatti e Indirizzo ── */}
              <Card title="Contatti e Indirizzo">
                <Field label="Telefono">
                  <input className="adm-input" style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 0421 123456" />
                </Field>
                <Field label="Indirizzo">
                  <input className="adm-input" style={inputStyle} type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Via Roma, 1" />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Città</label>
                    <input className="adm-input" style={inputStyle} type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>CAP</label>
                    <input className="adm-input" style={inputStyle} type="text" value={zip} onChange={(e) => setZip(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Regione</label>
                    <input className="adm-input" style={inputStyle} type="text" value={region} onChange={(e) => setRegion(e.target.value)} />
                  </div>
                </div>
              </Card>

              </>}

              {show("communications") && <>
              {/* ── Avviso Menu ── */}
              <Card title="Avviso Menu">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "10px 12px", background: T.surface, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.dark, margin: 0 }}>Mostra popup iniziale</p>
                    <p style={{ fontSize: 11, color: T.off, margin: "2px 0 0" }}>Avviso allergeni/surgelati mostrato quando il cliente apre il menu.</p>
                  </div>
                  <Toggle on={menuNoticeEnabled} onChange={() => setMenuNoticeEnabled((v) => !v)} />
                </div>
                <TranslationTabs
                  activeTab={menuNoticeTab}
                  onTabChange={setMenuNoticeTab}
                  fields={[{ key: "text", label: "Testo avviso", multiline: true, sourceValue: menuNoticeText }]}
                  i18n={menuNoticeI18n}
                  onI18nChange={setMenuNoticeI18n}
                  enabledLocales={enabledLocales}
                  disabledLocales={disabledLocales}
                  customLocales={customLocales}
                >
                  <Field label="Testo italiano">
                    <textarea
                      className="adm-textarea"
                      style={{ ...textareaStyle, minHeight: 120 }}
                      value={menuNoticeText}
                      onChange={(e) => setMenuNoticeText(e.target.value)}
                      rows={6}
                      placeholder="Testo mostrato nel popup..."
                    />
                  </Field>
                </TranslationTabs>
              </Card>

              </>}

              {show("profile") && <>
              {/* ── Social Media ── */}
              <Card title="Social Media">
                <Field label="Facebook (URL)">
                  <input className="adm-input" style={inputStyle} type="url" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                </Field>
                <Field label="Instagram (URL)">
                  <input className="adm-input" style={inputStyle} type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
                </Field>
                <Field label="WhatsApp (numero con prefisso internazionale)">
                  <input className="adm-input" style={inputStyle} type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="393331234567" />
                </Field>
              </Card>
              </>}
            </div>

            {/* ── RIGHT column ── */}
            <div>
              {show("communications") && <>
              {/* ── Promozione / Alert ── */}
              <Card title="Promozione / Alert">
                <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
                  Questa promozione viene mostrata come popup all&apos;apertura dell&apos;app.
                </p>
                <Field label="Titolo">
                  <input className="adm-input" style={inputStyle} type="text" value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} placeholder="Offerta speciale!" />
                </Field>
                <Field label="Contenuto">
                  <textarea className="adm-textarea" style={{ ...textareaStyle, minHeight: 72 }} value={promoContent} onChange={(e) => setPromoContent(e.target.value)} rows={3} placeholder="Descrizione della promozione..." />
                </Field>
                <Field label="Data scadenza">
                  <input className="adm-input" style={inputStyle} type="date" value={promoTillDate} onChange={(e) => setPromoTillDate(e.target.value)} />
                  <p style={{ fontSize: 11, color: T.off, marginTop: 4 }}>La promozione non sarà più visibile dopo questa data</p>
                </Field>
                <div>
                  <label style={labelStyle}>Immagine Promozionale</label>
                  {promoUrl ? (
                    <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", borderRadius: 6, overflow: "hidden", background: T.border }}>
                      <Image src={promoUrl} alt="Promo" fill style={{ objectFit: "cover" }} unoptimized />
                      <button
                        type="button"
                        onClick={() => promoInputRef.current?.click()}
                        disabled={uploadingPromo}
                        style={{ position: "absolute", bottom: 8, right: 8, background: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }}
                      >
                        <i className="fa-solid fa-pen" style={{ fontSize: 12, color: T.text }} />
                      </button>
                      {uploadingPromo && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#fff", fontSize: 13 }}>Caricamento...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => promoInputRef.current?.click()}
                      disabled={uploadingPromo}
                      style={{ width: "100%", aspectRatio: "16/7", borderRadius: 6, border: `2px dashed ${T.border}`, background: T.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: T.off, fontSize: 13 }}
                    >
                      <i className="fa-solid fa-image" style={{ fontSize: 24, opacity: 0.4 }} />
                      <span>{uploadingPromo ? "Caricamento..." : "Clicca per caricare un'immagine"}</span>
                    </button>
                  )}
                  <input ref={promoInputRef} type="file" accept="image/*" onChange={handlePromoImageChange} style={{ display: "none" }} />
                </div>
              </Card>

              </>}

              {show("languages") && (
              /* ── Lingue ── */
              <Card title="Lingue">
                <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
                  L&apos;italiano è sempre attivo. Abilita le lingue standard o aggiungi lingue personalizzate (es. dialetti regionali).
                </p>

                {/* Standard locales */}
                <p style={{ fontSize: 10, fontWeight: 700, color: T.off, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Standard</p>
                {STANDARD_NON_IT.map((locale) => {
                  const FLAG: Record<string, string> = { en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸", nl: "🇳🇱", ru: "🇷🇺", pt: "🇵🇹" };
                  const LABEL: Record<string, string> = { en: "English", de: "Deutsch", fr: "Français", es: "Español", nl: "Nederlands", ru: "Русский", pt: "Português" };
                  const CODE: Record<string, string> = { en: "EN", de: "DE", fr: "FR", es: "ES", nl: "NL", ru: "RU", pt: "PT" };
                  const state: "off" | "hidden" | "live" = disabledLocales.includes(locale) ? "off" : enabledLocales.includes(locale) ? "live" : "hidden";
                  const setState = (s: "off" | "hidden" | "live") => {
                    setEnabledLocales((prev) => s === "live" ? [...prev.filter((l) => l !== locale), locale] : prev.filter((l) => l !== locale));
                    setDisabledLocales((prev) => s === "off" ? [...prev.filter((l) => l !== locale), locale] : prev.filter((l) => l !== locale));
                  };
                  return (
                    <div key={locale} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.off, background: T.offBg, borderRadius: 4, padding: "1px 5px" }}>{CODE[locale]}</span>
                        <span style={{ fontSize: 18 }}>{FLAG[locale]}</span>
                        <span style={{ fontSize: 13, color: T.text }}>{LABEL[locale]}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(["off", "hidden", "live"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setState(s)}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 4,
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              background: state === s ? (s === "live" ? "#16A34A" : s === "hidden" ? "#F59E0B" : "#DC2626") : "#F3F4F6",
                              color: state === s ? "#fff" : "#6B7280",
                            }}
                          >
                            {s === "off" ? "Off" : s === "hidden" ? "Hidden" : "Live"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Custom locales */}
                <p style={{ fontSize: 10, fontWeight: 700, color: T.off, textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 6px" }}>Personalizzate</p>
                {customLocales.length === 0 && (
                  <p style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>Nessuna lingua personalizzata. Aggiungine una qui sotto.</p>
                )}
                {customLocales.map((cl) => {
                  const state: "off" | "hidden" | "live" = disabledLocales.includes(cl.code) ? "off" : enabledLocales.includes(cl.code) ? "live" : "hidden";
                  const setState = (s: "off" | "hidden" | "live") => {
                    setEnabledLocales((prev) => s === "live" ? [...prev.filter((l) => l !== cl.code), cl.code] : prev.filter((l) => l !== cl.code));
                    setDisabledLocales((prev) => s === "off" ? [...prev.filter((l) => l !== cl.code), cl.code] : prev.filter((l) => l !== cl.code));
                  };
                  const isEditing = editingLocale?.code === cl.code;
                  return (
                    <div key={cl.code} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.accentDeep, background: T.accentLight, borderRadius: 4, padding: "1px 5px" }}>{cl.code.toUpperCase()}</span>
                          <span style={{ fontSize: 13, color: T.text }}>{cl.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button type="button" onClick={() => setEditingLocale(isEditing ? null : { ...cl })} style={{ fontSize: 11, color: T.accentDeep, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                            {isEditing ? "Annulla" : "Modifica"}
                          </button>
                          <button type="button" onClick={() => {
                            setCustomLocales(customLocales.filter((l) => l.code !== cl.code));
                            setEnabledLocales(enabledLocales.filter((l) => l !== cl.code));
                            setDisabledLocales(disabledLocales.filter((l) => l !== cl.code));
                          }} style={{ fontSize: 11, color: T.danger, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            Rimuovi
                          </button>
                          <div style={{ display: "flex", gap: 4 }}>
                            {(["off", "hidden", "live"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setState(s)}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 10px",
                                  borderRadius: 4,
                                  border: "none",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  background: state === s ? (s === "live" ? "#16A34A" : s === "hidden" ? "#F59E0B" : "#DC2626") : "#F3F4F6",
                                  color: state === s ? "#fff" : "#6B7280",
                                }}
                              >
                                {s === "off" ? "Off" : s === "hidden" ? "Hidden" : "Live"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {isEditing && editingLocale && (
                        <div style={{ paddingBottom: 10, display: "flex", gap: 8 }}>
                          <input
                            className="adm-input"
                            style={{ ...inputStyle, width: 80, flexShrink: 0, textTransform: "uppercase" }}
                            value={editingLocale.code}
                            onChange={(e) => setEditingLocale({ ...editingLocale, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                            placeholder="vec"
                            maxLength={10}
                          />
                          <input
                            className="adm-input"
                            style={{ ...inputStyle, flex: 1 }}
                            value={editingLocale.name}
                            onChange={(e) => setEditingLocale({ ...editingLocale, name: e.target.value })}
                            placeholder="Veneto"
                            maxLength={50}
                          />
                          <button type="button" onClick={() => {
                            if (!editingLocale.code || !editingLocale.name) return;
                            setCustomLocales(customLocales.map((l) => l.code === cl.code ? editingLocale : l));
                            setEnabledLocales(enabledLocales.map((l) => l === cl.code ? editingLocale.code : l));
                            setDisabledLocales(disabledLocales.map((l) => l === cl.code ? editingLocale.code : l));
                            setEditingLocale(null);
                          }} style={{ padding: "0 12px", height: 36, background: T.accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                            Salva
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add new custom locale */}
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <input
                    className="adm-input"
                    style={{ ...inputStyle, width: 80, flexShrink: 0 }}
                    value={newLocaleCode}
                    onChange={(e) => setNewLocaleCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="vec"
                    maxLength={10}
                  />
                  <input
                    className="adm-input"
                    style={{ ...inputStyle, flex: 1 }}
                    value={newLocaleName}
                    onChange={(e) => setNewLocaleName(e.target.value)}
                    placeholder="Veneto"
                    maxLength={50}
                  />
                  <button type="button" onClick={() => {
                    const code = newLocaleCode.trim();
                    const name = newLocaleName.trim();
                    if (!code || !name) return;
                    if (customLocales.some((l) => l.code === code)) return;
                    setCustomLocales([...customLocales, { code, name }]);
                    setNewLocaleCode("");
                    setNewLocaleName("");
                  }} disabled={!newLocaleCode.trim() || !newLocaleName.trim()} style={{ padding: "0 12px", height: 36, background: T.accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, opacity: !newLocaleCode.trim() || !newLocaleName.trim() ? 0.5 : 1 }}>
                    + Aggiungi
                  </button>
                </div>
              </Card>

              )}

              {show("chat-ai") && (
              /* ── Chat Agent ── */
              <Card title="Chat Agent">
                <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
                  Istruzioni personalizzate per l&apos;assistente chat del menu. Verranno usate dall&apos;AI per consigliare i piatti ai clienti.
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "10px 12px", background: T.surface, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.dark, margin: 0 }}>Abilita chat AI</p>
                    <p style={{ fontSize: 11, color: T.off, margin: "2px 0 0" }}>Mostra il pulsante chat ai clienti sul menu</p>
                  </div>
                  <Toggle on={aiChatEnabled} onChange={() => setAiChatEnabled((v) => !v)} />
                </div>
                <Field label="Prompt Personalizzato">
                  <textarea
                    className="adm-textarea"
                    style={{ ...textareaStyle, minHeight: 120 }}
                    value={chatAgentPrompt}
                    onChange={(e) => setChatAgentPrompt(e.target.value)}
                    rows={6}
                    placeholder="es. Stasera consiglia il menu degustazione di pesce. Abbiamo ricevuto ostriche fresche, consiglialo a chi chiede di pesce."
                  />
                  <p style={{ fontSize: 11, color: T.off, marginTop: 4 }}>
                    Queste istruzioni vengono aggiunte al prompt base dell&apos;assistente. Aggiornamento entro 1 ora.
                  </p>
                </Field>
              </Card>

              )}

              {show("publishing") && <>
              {/* ── Visibilità Menu ── */}
              <Card title="Visibilità Menu">
                {published === false && (
                  <div style={{ background: T.warnBg, border: `1px solid ${T.warnBorder}`, borderRadius: 6, padding: "10px 14px", color: T.warn, fontSize: 12, marginBottom: 14 }}>
                    Il tuo menu non è ancora pubblico — pubblica per attivare il QR code.
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.dark, margin: 0 }}>
                      {published ? "Menu pubblico" : "Menu non pubblico"}
                    </p>
                    <p style={{ fontSize: 11, color: T.off, margin: "2px 0 0" }}>
                      {published ? "I clienti possono vedere il menu tramite QR code." : "Il menu non è visibile ai clienti."}
                    </p>
                  </div>
                  <button
                    onClick={handlePublishToggle}
                    disabled={publishing}
                    style={{ padding: "7px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: published ? T.offBg : T.accent, color: published ? T.text : "#fff", opacity: publishing ? 0.5 : 1 }}
                  >
                    {publishing ? "In corso..." : published ? "Nascondi menu" : "Pubblica menu"}
                  </button>
                </div>
              </Card>

              </>}
            </div>

          </div>{/* end 2-col grid */}

          {/* ── Save (full width) ── */}
          <div style={{ position: "sticky", bottom: 16, marginTop: 16 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 8,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 2px 8px rgba(196,122,79,.35)",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Salvataggio..." : "Salva Modifiche"}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

