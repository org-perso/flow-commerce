import {
  ArrowRight,
  Check,
  Plus,
  BarChart3,
  Boxes,
  ClipboardList,
  MessageCircle,
  Monitor,
  NotebookPen,
  PackageX,
  Smartphone,
  Truck,
  Users,
  Wallet,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

import Image from "next/image";

import { GooglePlayIcon } from "@/components/google-play-icon";
import { PhoneFrame } from "@/components/phone-preview";
import { SiteFooter, SiteHeader, btn, container } from "@/components/site-chrome";
import { PLAY_STORE_URL, SIGN_UP_URL } from "@/lib/links";

const PROBLEMS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: NotebookPen,
    title: "Commandes éparpillées",
    text: "Dans Messenger, WhatsApp, un cahier… et on en oublie.",
  },
  {
    icon: PackageX,
    title: "Stock approximatif",
    text: "On vend un produit qu’on n’a plus.",
  },
  {
    icon: CircleHelp,
    title: "Bénéfice inconnu",
    text: "On encaisse, mais combien reste-t-il après les achats et les dépenses ?",
  },
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ClipboardList,
    title: "Commandes",
    text: "Notez une commande en quelques secondes : produits, lieu et heure de livraison, client. Suivez chaque état jusqu’au paiement.",
  },
  {
    icon: Boxes,
    title: "Stock",
    text: "Le stock se met à jour tout seul à chaque commande. Un produit manque ? Correction en un geste.",
  },
  {
    icon: Truck,
    title: "Livraisons",
    text: "Assignez un livreur, il est prévenu sur son téléphone et organise sa tournée par moment et par lieu.",
  },
  {
    icon: Wallet,
    title: "Encaissement",
    text: "Qui a payé, qui doit encore payer, et ce que chaque livreur doit vous remettre.",
  },
  {
    icon: Users,
    title: "Clients",
    text: "L’historique de chaque client, et la même commande refaite en un clic.",
  },
  {
    icon: BarChart3,
    title: "Bénéfice et recap",
    text: "Chiffre d’affaires, coûts, dépenses, marge réelle, et les quantités vendues par produit.",
  },
];

const STEPS = [
  { title: "Créez votre boutique", text: "Avec votre email ou votre compte Google, en une minute." },
  { title: "Ajoutez vos produits", text: "Prix de vente, prix d’achat, stock." },
  { title: "Notez vos commandes", text: "Flow.Co s’occupe du stock, des livraisons et des calculs." },
];

const ROLES = [
  { role: "Propriétaire", text: "Voit tout : ventes, coûts, bénéfice, équipe." },
  { role: "Gérant", text: "Gère commandes, stock et livraisons au quotidien." },
  {
    role: "Community manager",
    text: "Note les commandes depuis les messages, sans voir vos coûts ni votre chiffre d’affaires.",
  },
  { role: "Livreur", text: "Voit ses livraisons, organise sa tournée, marque livré et payé." },
];

const PLANS = [
  {
    name: "Gratuit",
    tagline: "Pour démarrer et tester",
    price: "0 Ar",
    period: "",
    features: [
      "1 boutique",
      "Jusqu’à 50 commandes par mois",
      "Stock, clients et dépenses",
      "Bénéfice du jour",
      "App Android et version web",
    ],
    cta: "Commencer gratuitement",
    featured: false,
  },
  {
    name: "Pro",
    tagline: "Pour le vendeur qui fait tout seul",
    price: "20 000 Ar",
    period: "/ mois",
    features: [
      "Tout le Gratuit, plus :",
      "Commandes illimitées",
      "Recap des ventes par produit",
      "Récap WhatsApp au client",
      "Couleurs et filtres personnalisés",
    ],
    cta: "Choisir Pro",
    featured: true,
  },
  {
    name: "Business",
    tagline: "Pour travailler en équipe",
    price: "30 000 Ar",
    period: "/ mois",
    features: [
      "Tout le Pro, plus :",
      "Équipe : gérant, community managers",
      "Livreurs, tournées et notifications",
      "Plusieurs boutiques",
      "Coûts et marges cachés à l’équipe",
    ],
    cta: "Choisir Business",
    featured: false,
  },
];

const FAQ = [
  {
    q: "Est-ce que c’est payant ?",
    a: "Non, la formule Gratuit est disponible sans limite de durée. Les formules Pro et Business ajoutent les commandes illimitées et le travail en équipe.",
  },
  {
    q: "Faut-il un ordinateur ?",
    a: "Non, tout se fait depuis le téléphone. La version web est un plus pour le bureau.",
  },
  {
    q: "Et sur iPhone ?",
    a: "L’app est pour l’instant sur Android. La version web fonctionne sur tous les appareils, iPhone compris.",
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Vos données sont hébergées de façon sécurisée et ne sont jamais revendues. Vos prix d’achat restent visibles uniquement par vous.",
  },
  { q: "Puis-je gérer plusieurs boutiques ?", a: "Oui, depuis le même compte." },
  {
    q: "Comment supprimer mon compte ?",
    a: "Depuis l’app : Compte › Paramètres du compte › Supprimer mon compte.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy text-white">
          <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border-[40px] border-gold/15" />
          <div className={`${container} relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-20`}>
            <div>
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-on-navy-muted">
                Pour les vendeurs Facebook, Instagram et WhatsApp
              </p>
              <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
                De la commande au bénéfice,{" "}
                <span className="text-gold">directement depuis votre téléphone.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-on-navy-muted">
                Flow.Co rassemble vos commandes, votre stock, vos livraisons et vos bénéfices dans
                une seule app. Fini les cahiers et les captures d’écran.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={PLAY_STORE_URL} className={`${btn.base} ${btn.gold} ${btn.lg}`}>
                  <GooglePlayIcon /> Télécharger sur Google Play
                </a>
                <a href={SIGN_UP_URL} className={`${btn.base} ${btn.ghostOnNavy} ${btn.lg}`}>
                  Essayer gratuitement <ArrowRight className="size-4" />
                </a>
              </div>
              <p className="mt-6 text-sm text-on-navy-muted">
                Conçu à Madagascar, pour les vendeurs malgaches. Montants en Ariary.
              </p>
            </div>
            <PhoneFrame
              src="/images/screen-home.png"
              className="w-[260px] justify-self-center sm:w-[300px]"
              alt="Accueil de l’app Flow.Co : chiffre d’affaires, bénéfice et commandes à traiter"
              priority
            />
          </div>
        </section>

        {/* Problem */}
        <Section title="Vendre en ligne, c’est simple. Tout suivre, beaucoup moins.">
          <div className="grid gap-4 md:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-danger-soft text-danger">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Features */}
        <Section
          id="fonctionnalites"
          title="Tout votre commerce, au même endroit."
          className="bg-card"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-background p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-navy-soft text-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-gold-soft p-5 text-sm">
            <MessageCircle className="mt-0.5 size-5 shrink-0 text-gold-ink" />
            <p>
              <span className="font-semibold">Et aussi :</span> récap de commande envoyé au client
              sur WhatsApp, couleurs des états personnalisables, filtres enregistrés, plusieurs
              boutiques sur un même compte.
            </p>
          </div>
        </Section>

        {/* Screens */}
        <Section title="Pensé pour aller vite.">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center">
            <div>
              <div className="flex gap-4 sm:gap-6">
                <PhoneFrame
                  src="/images/screen-new-orders-1.jpeg"
                  alt="Nouvelle commande : client, produits et lieu de livraison"
                  width={702}
                  height={1600}
                  className="w-[150px] sm:w-[200px]"
                />
                <PhoneFrame
                  src="/images/screen-new-orders-2.jpeg"
                  alt="Nouvelle commande : date, créneau et paiement"
                  width={702}
                  height={1600}
                  className="w-[150px] sm:w-[200px] sm:translate-y-8"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground sm:mt-12">
                Une commande notée en quelques secondes, du produit au paiement
              </p>
            </div>
            <div>
              <div className="overflow-hidden rounded-xl border bg-card shadow-xl shadow-navy/10">
                <Image
                  src="/images/screen-web-orders.png"
                  alt="Tableau des commandes de la version web"
                  width={3580}
                  height={1852}
                  sizes="(min-width: 1024px) 640px, 100vw"
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Toutes vos commandes d’un coup d’œil sur ordinateur
              </p>
            </div>
          </div>
        </Section>

        {/* Steps */}
        <Section title="Comment ça marche" className="bg-card">
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border bg-background p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-gold font-bold text-on-gold">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Team */}
        <Section id="equipe" title="Chacun voit ce dont il a besoin.">
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLES.map(({ role, text }) => (
              <div key={role} className="flex gap-4 rounded-xl border bg-card p-5">
                <span className="h-fit rounded-full bg-navy-soft px-3 py-1 text-xs font-semibold">
                  {role}
                </span>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Invitez votre équipe en un lien. Vos prix d’achat et vos marges restent privés.
          </p>
        </Section>

        {/* Mobile + web */}
        <Section title="Sur le téléphone en livraison, sur l’ordinateur au bureau." className="bg-card">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-6">
              <Smartphone className="size-6 text-gold-ink" />
              <h3 className="mt-3 font-semibold">App Android</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pensée pour être utilisée à une main, même en pleine livraison.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-6">
              <Monitor className="size-6 text-gold-ink" />
              <h3 className="mt-3 font-semibold">Version web</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Grand tableau des commandes, filtres et actions groupées. Synchronisée avec le
                téléphone.
              </p>
            </div>
          </div>
        </Section>

        {/* Pricing */}
        <Section id="tarifs" title="Tarifs">
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl bg-card p-8 ${
                  plan.featured ? "border-2 border-gold shadow-xl shadow-navy/10" : "border"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-8 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-on-gold">
                    Le plus choisi
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href={SIGN_UP_URL}
                  className={`${btn.base} ${plan.featured ? btn.gold : btn.navy} ${btn.lg} mt-8 w-full`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Paiement mensuel par MVola, Orange Money ou Airtel Money. Sans engagement : changez de
            formule ou arrêtez quand vous voulez.
          </p>
        </Section>

        {/* FAQ */}
        <Section id="questions" title="Questions fréquentes" className="bg-card">
          <div className="divide-y rounded-xl border bg-background">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {q}
                  <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Final CTA */}
        <section className="bg-navy text-white">
          <div className={`${container} flex flex-col gap-6 py-16 lg:flex-row lg:items-center lg:justify-between`}>
            <h2 className="text-3xl font-bold">Prêt à y voir clair dans votre commerce ?</h2>
            <div className="flex flex-wrap gap-3">
              <a href={PLAY_STORE_URL} className={`${btn.base} ${btn.gold} ${btn.lg}`}>
                <GooglePlayIcon /> Télécharger l’app
              </a>
              <a href={SIGN_UP_URL} className={`${btn.base} ${btn.ghostOnNavy} ${btn.lg}`}>
                Essayer gratuitement <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  id,
  title,
  className = "",
  children,
}: {
  id?: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-16 ${className}`}>
      <div className={`${container} py-16 lg:py-20`}>
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
