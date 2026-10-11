import { Link } from "react-router-dom";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Clock3,
  FolderLock,
  Landmark,
  MapPin,
  Menu,
  Palmtree,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { createResource } from "@/lib/api";
import { isEmail } from "@/lib/validate";
import { Field, Input, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

const FEATURES: { n: string; title: string; text: string; icon: ReactNode }[] = [
  { n: "01", title: "Paie légale CNSS / AMO / IR", text: "Calcul marocain, bulletin PDF, Damancom et état 9421.", icon: <Landmark className="h-7 w-7" /> },
  { n: "02", title: "Employés", text: "Fiches, départements, postes et contrats au même endroit.", icon: <Users className="h-7 w-7" /> },
  { n: "03", title: "Congés", text: "Demandes en jours ouvrables, circuit manager, soldes et calendrier d’équipe.", icon: <Palmtree className="h-7 w-7" /> },
  { n: "04", title: "Présence", text: "Saisie RH, retards, absences et taux du mois.", icon: <Clock3 className="h-7 w-7" /> },
  { n: "05", title: "Documents", text: "Contrats, CIN, attestations et bulletins, avec droits d’accès.", icon: <FolderLock className="h-7 w-7" /> },
  { n: "06", title: "Assistant", text: "Inclus dès Pro, exécuté en local sur les données de votre société.", icon: <Sparkles className="h-7 w-7" /> },
];

const STEPS = [
  { n: "01", title: "Créez la société", text: "Essai de 14 jours. Vous invitez l’équipe ensuite." },
  { n: "02", title: "Rangez les dossiers", text: "Contrats, CIN, présences et soldes de congés." },
  { n: "03", title: "Clôturez le mois", text: "Calcul CNSS, AMO, IR, bulletin PDF et fichier de virement." },
];

const AUDIENCES = [
  { icon: Building2, title: "Une société de services à Casablanca", text: "Congés, présences et paie pour une équipe projet." },
  { icon: Briefcase, title: "Une équipe commerciale à Rabat", text: "Notes de frais, déplacements et soldes visibles par le manager." },
  { icon: Scale, title: "Un cabinet de conseil", text: "Plusieurs clients, chacun isolé, avec la paie légale." },
  { icon: ShieldCheck, title: "Données isolées par société", text: "Chaque société est un tenant. Un utilisateur de A ne lit jamais les lignes de B." },
];

const PLANS = [
  { name: "Essentiel", price: "490 MAD", per: "/ mois", items: ["25 salariés", "10 utilisateurs", "Paie légale", "Portail employé"] },
  { name: "Pro", price: "990 MAD", per: "/ mois", items: ["100 salariés", "40 utilisateurs", "Assistant local", "Rapports"], featured: true },
  { name: "Entreprise", price: "1 990 MAD", per: "/ mois", items: ["500 salariés", "150 utilisateurs", "WhatsApp (option)", "Accompagnement"] },
];

const FAQ = [
  { q: "La paie est-elle conforme au Maroc ?", a: "Oui. CNSS, AMO, IR, prime d’ancienneté et bulletins témoins 2026 font partie de la V1." },
  { q: "Mes données restent-elles isolées ?", a: "Chaque société est un tenant. Un utilisateur de A ne lit jamais les lignes de B." },
  { q: "L’essai est-il payant ?", a: "14 jours sur Essentiel, sans paiement en ligne. Le règlement se fait par virement." },
  { q: "L’assistant envoie-t-il les dossiers dans le cloud ?", a: "Non. Ollama tourne en local. Rien n’est créé sans votre confirmation." },
];

const COMPLIANCE = ["CNSS", "AMO", "IR", "Damancom", "État 9421", "Multi-société"];

const NAV = [
  { href: "#features", label: "Fonctions" },
  { href: "#pricing", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

const fieldClass =
  "h-[3.125rem] rounded-xl border-[#d4d4d4] text-[#0a0a0a] focus:border-[#6e2a72] focus:ring-[#6e2a72]/15";

export function LandingPage() {
  const { tr, lang, toggle } = useI18n();
  const [contact, setContact] = useState({ name: "", email: "", company: "", message: "" });
  const [sent, setSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function setLang(next: "fr" | "ar") {
    if (lang !== next) toggle();
  }

  async function onContact(e: FormEvent) {
    e.preventDefault();
    if (!contact.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (!isEmail(contact.email)) {
      toast.error("E-mail invalide.");
      return;
    }
    if (contact.message.trim().length < 10) {
      toast.error("Le message doit faire au moins 10 caractères.");
      return;
    }
    try {
      await createResource("/contact", contact);
      setSent(true);
      toast.success("Message envoyé");
    } catch {
      window.location.href = `mailto:contact@rhflow.ma?subject=${encodeURIComponent("Contact RHFlow")}&body=${encodeURIComponent(contact.message)}`;
      setSent(true);
    }
  }

  return (
    <div className="landing-jkt min-h-screen bg-white text-[#0a0a0a]">
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-2 md:p-4">
        <div className="flex h-[4.5rem] w-full max-w-[88rem] items-center justify-between rounded-full border border-black/6 bg-white/85 px-3 shadow-[0_12px_40px_-20px_rgba(28,25,23,0.35)] backdrop-blur-xl md:px-5">
          <a href="#top" className="flex shrink-0 items-center gap-2 pl-1 font-extrabold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6e2a72] text-xs text-white">RH</span>
            <span>RHFlow</span>
          </a>
          <nav className="hidden items-center gap-0.5 rounded-full bg-zinc-100 p-1 lg:flex" aria-label={tr("Menu")}>
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-500 transition-all hover:text-black">
                {tr(item.label)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 pr-1">
            <div className="hidden items-center rounded-full bg-zinc-100 p-1 text-[12px] font-semibold sm:inline-flex" role="group">
              <button type="button" className={`rounded-full px-2 py-1 ${lang === "fr" ? "bg-white text-black shadow-sm" : "text-zinc-500"}`} onClick={() => setLang("fr")}>
                FR
              </button>
              <span className="px-1 text-zinc-400">/</span>
              <button type="button" className={`rounded-full px-2 py-1 ${lang === "ar" ? "bg-white text-black shadow-sm" : "text-zinc-500"}`} onClick={() => setLang("ar")}>
                AR
              </button>
            </div>
            <Link to="/register" className="hidden items-center gap-1 rounded-full bg-[#6e2a72] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#54105a] md:inline-flex">
              {tr("Essai 14 jours")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-black lg:hidden"
              aria-expanded={menuOpen}
              aria-label={tr("Menu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="absolute inset-x-2 top-[5.25rem] rounded-3xl border border-[#e5e5e5] bg-white px-6 py-6 shadow-2xl lg:hidden">
            <div className="mb-4 inline-flex items-center rounded-full bg-zinc-100 p-1 text-[12px] font-semibold sm:hidden">
              <button type="button" className={`rounded-full px-2 py-1 ${lang === "fr" ? "bg-white text-black shadow-sm" : "text-zinc-500"}`} onClick={() => setLang("fr")}>FR</button>
              <span className="px-1 text-zinc-400">/</span>
              <button type="button" className={`rounded-full px-2 py-1 ${lang === "ar" ? "bg-white text-black shadow-sm" : "text-zinc-500"}`} onClick={() => setLang("ar")}>AR</button>
            </div>
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="block rounded-xl px-3 py-2.5 text-base font-medium" onClick={() => setMenuOpen(false)}>
                    {tr(item.label)}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/login" className="block rounded-xl px-3 py-2.5 text-base font-medium" onClick={() => setMenuOpen(false)}>
                  {tr("Connexion")}
                </Link>
              </li>
              <li className="pt-2">
                <Link to="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6e2a72] px-5 py-3 text-sm font-semibold text-white" onClick={() => setMenuOpen(false)}>
                  {tr("Essai 14 jours")}
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="top">
        <section className="relative overflow-hidden bg-black pt-32 text-white lg:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_80%_20%,rgba(110,42,114,0.45),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
          <div className="relative z-10 mx-auto grid w-full max-w-[88rem] items-center gap-10 px-5 py-16 md:px-8 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-7">
              <p className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                {tr("PME marocaines")}
              </p>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-[4.5rem]">
                {tr("Votre RH, simplement.")}
                <span className="mt-1 block text-white">{tr("Paie légale, données isolées.")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
                {tr("Centralisez employés, congés, présences, paie et documents dans une seule plateforme.")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#6e2a72] px-[1.35rem] py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#54105a] hover:shadow-[0_14px_28px_-14px_rgba(110,42,114,0.55)]">
                  {tr("Essayer 14 jours")} <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link to="/careers/technova" className="inline-flex items-center rounded-xl px-[1.1rem] py-3 text-sm font-semibold text-[#f5f5f5]/80 hover:text-white">
                  {tr("Carrières")}
                </Link>
                <Link to="/login" className="inline-flex items-center rounded-xl border border-white/30 px-[1.35rem] py-3 text-sm font-semibold text-[#f5f5f5] transition hover:border-white/55 hover:bg-white/8">
                  {tr("Voir la démonstration")}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <Preview tr={tr} />
            </div>
          </div>
        </section>

        <section className="border-b border-[#e5e5e5] bg-white">
          <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <p className="font-[Space_Grotesk,Inter,sans-serif] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e2a72]">{tr("Conformité Maroc")}</p>
            <ul className="flex flex-wrap gap-2">
              {COMPLIANCE.map((item) => (
                <li key={item} className="rounded-full bg-[#f4f4f5] px-3 py-1 text-sm font-semibold text-[#0a0a0a]">
                  {tr(item)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="scroll-mt-28 py-20 md:py-28">
          <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="font-[Space_Grotesk,Inter,sans-serif] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e2a72]">{tr("Fonctions")}</p>
                <h2 className="mt-2 max-w-xl text-3xl font-bold md:text-5xl">{tr("Tout le cycle RH, en français")}</h2>
              </div>
              <p className="max-w-md text-[#525252]">{tr("De la fiche salarié au bulletin, sans changer d’outil au milieu du mois.")}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.n} className="h-full rounded-2xl border border-[#e5e5e5] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(28,25,23,0.25)]">
                  <div className="text-[#6e2a72]">{feature.icon}</div>
                  <p className="mt-5 text-xs font-semibold tracking-widest text-[#6e2a72]">{feature.n}</p>
                  <h3 className="mt-2 text-2xl font-bold">{tr(feature.title)}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#525252]">{tr(feature.text)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4B164C]">{tr("Fonctions")}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{tr("Le cycle, de la fiche au bulletin")}</h2>
              <p className="mx-auto mt-4 max-w-xl text-[#525252]">{tr("Trois étapes, sans tableur parallèle.")}</p>
            </div>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
              {STEPS.map((step) => (
                <li key={step.n} className="relative border-l-2 border-[#e8e8e8] pl-6 md:border-l-0 md:border-t-2 md:pl-0 md:pt-6">
                  <span className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-[#4B164C] md:-top-[7px] md:left-0" />
                  <span className="text-sm font-bold tracking-widest text-[#4B164C]">{step.n}</span>
                  <h3 className="mt-2 text-lg font-semibold uppercase tracking-wide">{tr(step.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">{tr(step.text)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#f4f4f5] py-20 md:py-28">
          <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
            <div className="max-w-2xl">
              <p className="font-[Space_Grotesk,Inter,sans-serif] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e2a72]">{tr("PME marocaines")}</p>
              <h2 className="mt-2 text-3xl font-bold md:text-5xl">{tr("Pour qui")}</h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((item) => (
                <article key={item.title} className="h-full rounded-2xl border border-[#e5e5e5] bg-white p-7">
                  <item.icon className="h-7 w-7 text-[#6e2a72]" />
                  <h3 className="mt-5 text-lg font-semibold">{tr(item.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#525252]">{tr(item.text)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-28 py-20 md:py-28">
          <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
            <p className="font-[Space_Grotesk,Inter,sans-serif] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e2a72]">{tr("Tarifs")}</p>
            <h2 className="mt-2 text-3xl font-bold md:text-5xl">{tr("Tarifs en MAD")}</h2>
            <p className="mt-4 max-w-2xl text-lg text-[#525252]">{tr("Sans surprise. L’assistant est inclus à partir de Pro, exécuté en local.")}</p>
            <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex h-full flex-col rounded-2xl border p-7 ${
                    plan.featured ? "border-[#6e2a72] bg-[#6e2a72] text-white" : "border-[#e5e5e5] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{tr(plan.name)}</h3>
                    {plan.featured ? (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                        {tr("Le plus choisi")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-5 text-4xl font-extrabold tracking-tight">
                    {plan.price}
                    <span className={`ms-1 text-sm font-medium ${plan.featured ? "text-white/70" : "text-[#737373]"}`}>{tr(plan.per)}</span>
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${plan.featured ? "bg-white" : "bg-[#6e2a72]"}`} />
                        {tr(item)}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`mt-8 inline-flex w-fit items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      plan.featured ? "bg-white text-[#6e2a72]" : "bg-[#6e2a72] text-white"
                    }`}
                  >
                    {tr("Commencer")} <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 bg-[#f4f4f5] py-20 md:py-28">
          <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
            <p className="font-[Space_Grotesk,Inter,sans-serif] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e2a72]">FAQ</p>
            <h2 className="mt-2 text-3xl font-bold md:text-5xl">{tr("FAQ")}</h2>
            <div className="mt-10 space-y-3">
              {FAQ.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-[#e5e5e5] bg-white p-5">
                  <summary className="cursor-pointer list-none font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {tr(item.q)}
                      <span className="text-[#6e2a72] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[#525252]">{tr(item.a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-28 bg-[#f4f4f5] py-20 md:py-28">
          <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
            <div className="overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white shadow-sm">
              <div className="grid lg:grid-cols-12">
                <div className="flex flex-col justify-between bg-black px-8 py-10 text-white lg:col-span-5 md:px-10 md:py-12">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c084c4]">{tr("Contact")}</p>
                    <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">{tr("Parlons de votre paie")}</h2>
                    <p className="mt-4 max-w-sm text-base leading-relaxed text-white/80">
                      {tr("Une question sur CNSS, l’essai ou l’isolation des sociétés. Réponse sous 24 h ouvrées.")}
                    </p>
                    <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80">
                      <MapPin className="h-4 w-4 text-[#c084c4]" />
                      Casablanca
                    </p>
                  </div>
                  <a href="mailto:contact@rhflow.ma" className="mt-10 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-100">
                    contact@rhflow.ma <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="px-6 py-8 lg:col-span-7 md:px-10 md:py-12">
                  {sent ? (
                    <p className="text-lg font-semibold">{tr("Merci, nous vous répondons sous 24 h ouvrées.")}</p>
                  ) : (
                    <form className="grid gap-4" onSubmit={onContact}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Votre nom">
                          <Input required className={fieldClass} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                        </Field>
                        <Field label="E-mail">
                          <Input required type="email" className={fieldClass} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                        </Field>
                      </div>
                      <Field label="Société">
                        <Input className={fieldClass} value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
                      </Field>
                      <Field label="Message">
                        <Textarea required className="rounded-xl border-[#d4d4d4] text-[#0a0a0a] focus:border-[#6e2a72] focus:ring-[#6e2a72]/15" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} />
                      </Field>
                      <button type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6e2a72] px-5 py-3 text-sm font-semibold text-white hover:bg-[#54105a]">
                        {tr("Envoyer")} <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
            <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-[#6e2a72] p-8 text-center text-white md:flex-row md:p-12 md:text-start">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{tr("Essai 14 jours")}</p>
                <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">{tr("Votre RH, simplement.")}</h2>
                <p className="mt-3 text-white/75">{tr("Essai 14 jours, virement ensuite")}</p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row">
                <Link to="/login" className="inline-flex items-center rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  {tr("Voir la démonstration")}
                </Link>
                <Link to="/register" className="inline-flex items-center gap-1 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#6e2a72] hover:bg-zinc-100">
                  {tr("Essayer 14 jours")} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black pt-16 pb-8 text-[#f5f5f5]">
        <div className="mx-auto w-full max-w-[88rem] px-5 md:px-8">
          <div className="mb-12 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-lg font-extrabold">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#6e2a72] text-xs">RH</span>
                RHFlow
              </span>
              <p className="mt-3 max-w-xl text-base text-white/65">
                {tr("Centralisez employés, congés, présences, paie et documents dans une seule plateforme.")}
              </p>
            </div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-3 text-sm text-white/70">
              <MapPin className="h-4 w-4 text-[#c084c4]" />
              Casablanca · MAD
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#c084c4]">{tr("Produit")}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/65">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="transition-colors hover:text-white">{tr(item.label)}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#c084c4]">{tr("Fonctions")}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/65">
                <li>{tr("Paie légale")}</li>
                <li>{tr("Congés")}</li>
                <li>{tr("Présence")}</li>
                <li>{tr("Documents")}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#c084c4]">{tr("Société")}</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/65">
                <li><Link to="/login" className="hover:text-white">{tr("Connexion")}</Link></li>
                <li><Link to="/register" className="hover:text-white">{tr("Essai 14 jours")}</Link></li>
                <li><Link to="/login" className="hover:text-white">{tr("Démo")}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#c084c4]">{tr("Contact")}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <div className="text-[11px] uppercase tracking-wider text-white/40">{tr("E-mail")}</div>
                  <a href="mailto:contact@rhflow.ma" className="text-white/80 hover:text-white">contact@rhflow.ma</a>
                </li>
                <li>
                  <div className="text-[11px] uppercase tracking-wider text-white/40">{tr("Ville")}</div>
                  <p className="text-white/80">Casablanca</p>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-white/40 md:flex-row">
            <p>RHFlow Maroc</p>
            <p>{tr("RHFlow Maroc · Casablanca · Africa/Casablanca · devise MAD")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Preview({ tr }: { tr: (text: string) => string }) {
  const rows = [
    { label: "Demande de congé", value: "3 jours · en attente" },
    { label: "Présence du jour", value: "46 présents" },
    { label: "Paie octobre", value: "Calcul prêt" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-[#0a0a0a] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[#e5e5e5] bg-[#f4f4f5] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#6e2a72]/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6e2a72]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6e2a72]" />
        <p className="ms-2 text-xs font-semibold text-[#525252]">{tr("Aperçu tableau de bord")}</p>
      </div>
      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f4f4f5] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#737373]">{tr("Effectif")}</p>
            <p className="mt-1 text-2xl font-extrabold">48</p>
          </div>
          <div className="rounded-xl bg-[#f3e8f3] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6e2a72]">{tr("En congé")}</p>
            <p className="mt-1 text-2xl font-extrabold">3</p>
          </div>
        </div>
        <ul className="divide-y divide-[#e5e5e5] rounded-xl border border-[#e5e5e5]">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="font-medium">{tr(row.label)}</span>
              <span className="text-[#525252]">{tr(row.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
