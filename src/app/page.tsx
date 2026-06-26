'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getBrandName, getPlatformName } from '@/lib/brand-profile';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  Footprints,
  Gem,
  Images,
  Layers,
  LogIn,
  Menu,
  PackageCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  SprayCan,
  Store,
  Tag,
  TrendingUp,
  Upload,
  Watch,
  X,
} from 'lucide-react';

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Section({ id, children, className = '', dark = false }: { id?: string; children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <section id={id} className={`px-5 py-20 sm:px-8 md:py-28 ${dark ? 'bg-[#0b0b0b] text-white' : 'bg-white text-[#0a0a0a]'} ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function SectionBadge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`mb-5 inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${dark ? 'border-white/15 text-neutral-400' : 'border-neutral-300 text-neutral-500'}`}>
      {children}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-neutral-200">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-5 text-left text-base font-semibold text-[#0a0a0a] sm:text-lg">
        {q}
        <ChevronDown className={`ml-4 h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-44 pb-5' : 'max-h-0'}`}>
        <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">{a}</p>
      </div>
    </div>
  );
}

function OutputPreview() {
  const platformName = getPlatformName();

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10">
      <div className="relative aspect-[4/3] w-full bg-neutral-100">
        <Image
          src="/mitty-homepage-hero.png"
          alt={`${platformName} product catalog workflow preview`}
          fill
          sizes="(min-width: 1024px) 520px, 100vw"
          className="object-cover"
          priority
        />
      </div>
      <div className="grid gap-3 border-t border-neutral-200 p-4 sm:grid-cols-3">
        {[
          { icon: Camera, label: 'Product views' },
          { icon: FileText, label: 'SEO copy' },
          { icon: Download, label: 'Catalog export' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
            <item.icon className="h-4 w-4 text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mobileNav, setMobileNav] = useState(false);
  const brandName = getBrandName();
  const platformName = getPlatformName();

  const navLinks = [
    { label: 'Results', href: '#results' },
    { label: 'Who It Helps', href: '#buyers' },
    { label: 'Workflow', href: '#how-it-works' },
    { label: 'Categories', href: '#categories' },
    { label: 'FAQ', href: '#faq' },
  ];

  const proofStats = [
    { value: '1 upload', label: 'to start a product listing' },
    { value: '4 views', label: 'front, side, back, and flatlay' },
    { value: 'CSV ready', label: 'content for catalog teams' },
  ];

  const buyerSegments = [
    { icon: Store, title: 'Boutiques', desc: 'Turn daily store arrivals into online listings without waiting for a full shoot.' },
    { icon: Shirt, title: 'Fashion brands', desc: 'Create consistent images, product titles, and descriptions for every launch.' },
    { icon: Gem, title: 'Jewellery stores', desc: 'Prepare clean product assets for rings, earrings, necklaces, and bridal collections.' },
    { icon: Watch, title: 'Watch sellers', desc: 'Build polished catalog pages for lifestyle watch shots and product listings.' },
    { icon: PackageCheck, title: 'D2C brands', desc: 'Move from product photo to launch content with fewer handoffs.' },
    { icon: Tag, title: 'Marketplace sellers', desc: 'Generate listing-ready content for repeated uploads and bulk catalog work.' },
  ];

  const benefits = [
    { icon: Clock3, title: 'Launch products faster', desc: 'Reduce the time between receiving stock and publishing it online.' },
    { icon: TrendingUp, title: 'Improve listing quality', desc: 'Give buyers cleaner visuals, clearer descriptions, and complete fields.' },
    { icon: BadgeCheck, title: 'Keep output consistent', desc: 'Use one workflow for images, SEO copy, attributes, and export files.' },
  ];

  const categoryGroups = [
    { icon: Shirt, name: 'Menswear', items: 'Shirts, trousers, jeans, suits, ethnic wear, footwear, perfumes' },
    { icon: Sparkles, name: 'Womenswear', items: 'Tops, gowns, dresses, kurtis, co-ords, western wear' },
    { icon: Layers, name: 'Ethnic Wear', items: 'Kurta sets, sherwani, Indo-western, lehenga, gowns, festive wear' },
    { icon: Gem, name: 'Jewellery', items: 'Rings, earrings, necklaces, bangles, bracelets, bridal jewellery' },
    { icon: Watch, name: 'Watches', items: "Men's watches, women's watches, lifestyle watch shots, product catalog shots" },
    { icon: Footprints, name: 'Footwear', items: "Men's shoes, women's footwear, sandals, sneakers, formal shoes" },
    { icon: SprayCan, name: 'Perfume & Beauty', items: 'Perfume bottles, boxes, hero shots, product descriptions' },
    { icon: ShoppingBag, name: 'Bags & Accessories', items: 'Handbags, wallets, belts, sunglasses, fashion accessories' },
    { icon: Store, name: 'Boutique Retail', items: 'Mixed fashion catalogs, store collections, online product listings' },
  ];

  const sampleOutputs = [
    { title: 'Generated product views', desc: 'Front, side, back, flatlay, and product-focused catalog images.', icon: Images },
    { title: 'SEO title and description', desc: 'Readable, keyword-aware copy built for product pages and marketplaces.', icon: FileText },
    { title: 'Catalog fields', desc: 'Category, fabric, fit, pattern, size, and product attributes in one place.', icon: Layers },
    { title: 'Export files', desc: 'Downloadable content that helps teams upload products faster.', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-white font-body text-[#0a0a0a] antialiased">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/mitty-studio-logo.png" alt={platformName} width={36} height={36} className="h-9 w-9 rounded-sm object-contain" priority />
            <span className="text-base font-bold tracking-tight">{platformName}</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-neutral-500 transition-colors hover:text-[#0a0a0a]">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/studio" className="hidden rounded-lg bg-[#0a0a0a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1a1a] md:inline-flex">
              Login
            </Link>
            <button type="button" onClick={() => setMobileNav(!mobileNav)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 md:hidden" aria-label="Menu">
              {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNav && (
          <div className="border-t border-neutral-100 bg-white px-5 pb-5 pt-3 md:hidden">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className="block py-2.5 text-sm font-medium text-neutral-600 hover:text-[#0a0a0a]">
                {link.label}
              </a>
            ))}
            <Link href="/studio" onClick={() => setMobileNav(false)} className="mt-3 block w-full rounded-lg bg-[#0a0a0a] py-3 text-center text-sm font-semibold text-white">
              Login
            </Link>
          </div>
        )}
      </header>

      <div className="h-16" />

      <Section className="!pb-16 !pt-14 sm:!pb-20 sm:!pt-20 md:!pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <Reveal>
            <SectionBadge>Product content studio</SectionBadge>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Create marketplace-ready product photos and catalog content in minutes.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
              Upload product photos and get clean product views, SEO titles, descriptions, attributes, and catalog exports from one focused workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/studio" className="inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1a1a]">
                Login <LogIn className="h-4 w-4" />
              </Link>
              <a href="#results" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-6 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:border-neutral-400 hover:bg-neutral-50">
                See Sample Output
              </a>
            </div>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {proofStats.map((stat) => (
                <div key={stat.value} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-lg font-extrabold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={180}>
            <OutputPreview />
          </Reveal>
        </div>
      </Section>

      <Section id="results" dark className="!py-20">
        <Reveal>
          <SectionBadge dark>Before to listing</SectionBadge>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Show users the result before they start the app.</h2>
              <p className="mt-4 max-w-xl text-neutral-400">
                {platformName} is built to convert a basic product photo into the pieces a selling page needs.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {sampleOutputs.map((item, i) => (
                <Reveal key={item.title} delay={i * 80}>
                  <div className="min-h-44 rounded-xl border border-white/10 bg-white/[0.04] p-5">
                    <item.icon className="h-6 w-6 text-neutral-400" />
                    <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>

      <Section id="buyers">
        <Reveal>
          <SectionBadge>Who it helps</SectionBadge>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Made for retail teams that need products online faster.</h2>
          <p className="mt-4 max-w-2xl text-neutral-600">
            The homepage should speak to the buyer. These are the businesses most likely to understand the value quickly.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyerSegments.map((segment, i) => (
            <Reveal key={segment.title} delay={i * 70}>
              <div className="group min-h-48 rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:border-neutral-400 hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0a0a0a] text-white transition-transform duration-300 group-hover:scale-105">
                  <segment.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">{segment.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{segment.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section dark className="!py-20">
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <SectionBadge dark>Why it sells</SectionBadge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Less manual work. More products ready to publish.</h2>
              <p className="mt-4 text-neutral-400">
                Buyers do not pay for features. They pay because the work becomes faster, cleaner, and easier to repeat.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {benefits.map((benefit, i) => (
                <Reveal key={benefit.title} delay={i * 80}>
                  <div className="min-h-52 rounded-xl border border-white/10 bg-white/[0.04] p-6">
                    <benefit.icon className="h-7 w-7 text-white" />
                    <h3 className="mt-5 text-base font-semibold text-white">{benefit.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-400">{benefit.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </Section>

      <Section id="how-it-works">
        <Reveal>
          <SectionBadge>Workflow</SectionBadge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From upload to catalog in one guided flow.</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { step: '01', icon: Upload, title: 'Upload photos', desc: 'Start with product photos from a phone, camera, or team folder.' },
            { step: '02', icon: Tag, title: 'Add details', desc: 'Choose category and enter the product details your listing needs.' },
            { step: '03', icon: Camera, title: 'Generate views', desc: 'Create product views that feel cleaner and more catalog-ready.' },
            { step: '04', icon: FileText, title: 'Create copy', desc: 'Get title, description, and structured product attributes.' },
            { step: '05', icon: Download, title: 'Export', desc: 'Download assets and catalog content for upload workflows.' },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 70}>
              <div className="group min-h-56 rounded-xl border border-neutral-200 p-6 transition-all duration-300 hover:border-neutral-400 hover:shadow-lg">
                <span className="text-xs font-bold text-neutral-300">{item.step}</span>
                <item.icon className="mt-4 h-6 w-6 text-[#0a0a0a] transition-transform duration-300 group-hover:scale-110" />
                <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="categories" className="border-y border-neutral-100 bg-neutral-50">
        <Reveal>
          <SectionBadge>Categories</SectionBadge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for modern retail categories.</h2>
          <p className="mt-4 max-w-2xl text-neutral-600">
            Support focused workflows for fashion, jewellery, watches, beauty, accessories, D2C brands, and marketplace sellers.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryGroups.map((cat, i) => (
            <Reveal key={cat.name} delay={i * 60}>
              <div className="group flex min-h-44 flex-col rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:border-neutral-400 hover:shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0a0a0a] text-white transition-transform duration-300 group-hover:scale-105">
                  <cat.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">{cat.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{cat.items}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section dark>
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <SectionBadge dark>Secure app login</SectionBadge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Login to {platformName} for your product workflow.</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-400">
                Built for retail businesses that upload products regularly and want a faster path from stock arrival to online listing.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/studio" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-neutral-100">
                  Login <LogIn className="h-4 w-4" />
                </Link>
                <a href="#faq" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/5">
                  Read FAQ
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {['Phone photos accepted', 'Product images generated', 'SEO copy included', 'Catalog export ready'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
                    <span className="text-sm font-medium text-neutral-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section id="faq">
        <Reveal>
          <SectionBadge>FAQ</SectionBadge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions users ask before logging in.</h2>
        </Reveal>
        <div className="mx-auto mt-12 max-w-3xl">
          <FaqItem q="Do I need professional product photos?" a="No. You can start with clear product photos from a phone or camera. Better source photos usually create better output, but the workflow is designed for practical retail use." />
          <FaqItem q={`What does ${platformName} create?`} a="It creates product images, SEO-ready titles, descriptions, catalog attributes, and export-ready content for product listing workflows." />
          <FaqItem q="Is it only for clothing?" a={`${platformName} supports fashion, jewellery, watches, footwear, perfumes, bags, accessories, boutiques, D2C brands, and marketplace sellers.`} />
          <FaqItem q="Can my team export catalog content?" a="Yes. The workflow is designed to prepare content that can be downloaded and used by catalog or marketplace upload teams." />
          <FaqItem q="Is public signup open?" a={`Public signup is not open right now. Login is available for existing ${brandName} team accounts.`} />
        </div>
      </Section>

      <footer className="border-t border-neutral-200 bg-white px-5 pb-24 pt-10 sm:px-8 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/mitty-studio-logo.png" alt={platformName} width={28} height={28} className="h-7 w-7 rounded-sm object-contain" />
            <span className="text-sm font-bold tracking-tight">{platformName}</span>
          </div>
          <p className="text-xs text-neutral-400">&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</p>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
        <Link href="/studio" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a0a0a] px-5 py-3 text-sm font-semibold text-white">
          Login <LogIn className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
