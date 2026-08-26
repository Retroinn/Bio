import { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, Code2, Disc3, Eye, Github, Globe, Image as ImageIcon,
  Layout, Link2, Music, Palette, QrCode, Sparkles, Star, Twitch, Twitter, Users,
} from 'lucide-react';
import { Link } from '@/components/Router';
import { Logo } from '@/components/ui';
import { useAuth } from '@/lib/auth';

const features = [
  { icon: Link2, title: 'Tek bağlantı, her şey', desc: 'Tüm sosyal hesapların, projelerin ve içeriklerin için tek bir adres.' },
  { icon: Palette, title: 'Tam özelleştirme', desc: 'Temalar, arka planlar, efektler ve renklerle profilini kendin tasarla.' },
  { icon: Layout, title: 'Esnek düzenler', desc: 'Classic, Modern, Minimal, Portfolio ve daha fazlası — gerçek farklı yapılar.' },
  { icon: Disc3, title: 'Discord entegrasyonu', desc: 'Discord hesabını bağla, varsa etkinliğini profilinde göster.' },
  { icon: BarChart3, title: 'Gizlilik dostu analitik', desc: 'Görüntülenme, tıklama ve CTR metriklerini takip et — IP saklamadan.' },
  { icon: QrCode, title: 'QR kodu', desc: 'Profilinin QR kodunu oluştur, PNG indir, anında paylaş.' },
  { icon: Music, title: 'Müzik çalar', desc: 'Favori parçanı profile ekle, ziyaretçilerin dinlesin.' },
  { icon: Globe, title: 'SEO kontrolü', desc: 'Başlık, açıklama ve OG görseliyle arama motorlarında görün.' },
];

const faqs = [
  { q: 'B.io ücretsiz mi?', a: 'Evet. Temel profil oluşturma, bağlantılar, sosyal hesaplar, projeler ve analitik tamamen ücretsizdir. İleride Pro planı ek özelliklerle gelecek.' },
  { q: 'Kullanıcı adımı sonra değiştirebilir miyim?', a: 'Evet, kullanıcı adını müsait olduğu sürece panelden değiştirebilirsin. Profil bağlantın b.io/kullanıcıadın şeklinde güncellenir.' },
  { q: 'Discord gerekli mi?', a: 'Hayır. Discord opsiyonel bir entegrasyondur. Bağlamadan da profilini oluşturup kullanabilirsin.' },
  { q: 'Profilim gizli olabilir mi?', a: 'Evet. Gizlilik ayarlarından profilini gizleyebilir, konum, sosyal hesaplar veya projeleri seçerek gizleyebilirsin.' },
  { q: 'Verilerim güvende mi?', a: 'Tüm veriler Supabase üzerinde satır seviyesinde güvenlikle saklanır. Başkaları yalnızca herkese açık kısımları görebilir.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-medium text-white">{q}</span>
        <span className={`text-ink-300 transition ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="px-5 pb-5 text-sm text-ink-200 animate-fade-in">{a}</p>}
    </div>
  );
}

function ProfilePreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent/10 blur-3xl" />
      <div className="card overflow-hidden rounded-[1.75rem] p-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent to-accent-deep p-0.5">
              <div className="grid h-full w-full place-items-center rounded-full bg-ink-900 font-display text-xl font-bold text-accent">
                NB
              </div>
            </div>
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-ink-800 bg-success" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-white">Nova Bennett</h3>
          <p className="text-sm text-accent">@nova</p>
          <p className="mt-1 text-xs text-ink-200">tasarımcı · geliştirici · gezgin</p>
          <p className="mt-3 text-sm text-ink-100">
            Dijital ürünler tasarlıyorum ve açık kaynak kodu yazıyorum.
          </p>
        </div>
        <div className="mt-5 flex justify-center gap-2">
          {[
            { icon: Twitter, label: 'X' },
            { icon: Github, label: 'GitHub' },
            { icon: Twitch, label: 'Twitch' },
            { icon: Star, label: 'Star' },
          ].map((s, i) => (
            <span
              key={i}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-ink-100 transition hover:border-accent/40 hover:text-accent"
            >
              <s.icon className="h-4 w-4" />
            </span>
          ))}
        </div>
        <div className="mt-5 space-y-2.5">
          {[
            { t: 'Yeni portföy sitesi', d: 'nova.design' },
            { t: 'Açık kaynak kütüphane', d: 'github.com/nova/ui' },
            { t: 'Haftalık bülten', d: 'nova.substack.com' },
          ].map((l, i) => (
            <div
              key={i}
              className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-accent/30 hover:bg-white/[0.04]"
            >
              <div>
                <p className="text-sm font-medium text-ink-50">{l.t}</p>
                <p className="text-xs text-ink-300">{l.d}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:text-accent" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { session } = useAuth();

  useEffect(() => {
    document.title = 'B.io — Your identity. One link.';
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-ink-100 md:flex">
            <a href="#features" className="transition hover:text-white">Özellikler</a>
            <a href="#explore" className="transition hover:text-white">Keşfet</a>
            <a href="#pricing" className="transition hover:text-white">Fiyatlandırma</a>
            <a href="#faq" className="transition hover:text-white">SSS</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link to="/dashboard" className="btn-primary">Panele Git</Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Giriş yap</Link>
                <Link to="/register" className="btn-primary">Profil oluştur</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-grid-faint [background-size:48px_48px] opacity-40" />
        <div className="absolute left-1/2 top-0 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
          <div className="animate-slide-up">
            <span className="chip mb-5">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Yeni · B.io açık beta
            </span>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl md:text-6xl">
              Your identity. <span className="text-accent glow-text">One link.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-100">
              Share your links, socials, projects and online identity through one beautiful profile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">
                B.io'nu oluştur <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#explore" className="btn-outline">Profilleri keşfet</a>
            </div>
            <div className="mt-8 flex items-center gap-5 text-xs text-ink-300">
              <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Herkese açık</span>
              <span className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> Açık kaynak</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Topluluk odaklı</span>
            </div>
          </div>
          <div className="animate-fade-in">
            <ProfilePreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Tek profilde her şey</h2>
          <p className="mt-3 text-ink-200">İhtiyacın olan tüm araçlar, sade ve şık bir arayüzde.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card group p-5 transition hover:border-accent/20 hover:shadow-glow">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-200">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase strip */}
      <section id="explore" className="mx-auto max-w-6xl px-5 py-16">
        <div className="card overflow-hidden p-8 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-display text-2xl font-bold text-white">Profilini sen tasarla</h3>
              <p className="mt-3 text-ink-200">
                Temalar, düzenler, efektler ve renklerle profilini kişiselleştir. Her detayı kontrol sende.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-ink-100">
                {['Yerleşik temalar ve özel renkler', 'Sürükle-bırak bağlantı sıralama', 'Canlı önizleme', 'Mobil öncelikli tasarım'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/15 text-accent">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-primary mt-6">Hemen başla</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ImageIcon, t: 'Medya' },
                { icon: Music, t: 'Müzik' },
                { icon: Code2, t: 'Projeler' },
                { icon: QrCode, t: 'QR Kod' },
              ].map((c) => (
                <div key={c.t} className="card flex items-center gap-3 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] text-accent">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-ink-50">{c.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Basit fiyatlandırma</h2>
          <p className="mt-3 text-ink-200">Başlamak ücretsiz. Pro yakında.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-7">
            <h3 className="font-display text-lg font-semibold text-white">Free</h3>
            <p className="mt-1 text-sm text-ink-200">Bireysel kullanım için</p>
            <p className="mt-5 font-display text-4xl font-bold text-white">₺0<span className="text-base font-normal text-ink-300">/ay</span></p>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-100">
              {['Sınırsız bağlantı', 'Sosyal hesaplar', 'Projeler', 'Temel analitik', 'QR kod', 'Herkese açık profil'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="text-accent">✓</span>{t}</li>
              ))}
            </ul>
            <Link to="/register" className="btn-outline mt-7 w-full">Ücretsiz başla</Link>
          </div>
          <div className="card relative border-accent/30 p-7 shadow-glow">
            <span className="absolute -top-3 left-7 chip border-accent/40 bg-accent/10 text-accent">Yakında</span>
            <h3 className="font-display text-lg font-semibold text-white">Pro</h3>
            <p className="mt-1 text-sm text-ink-200">Gelişmiş özellikler</p>
            <p className="mt-5 font-display text-4xl font-bold text-white">—<span className="text-base font-normal text-ink-300">/ay</span></p>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-100">
              {['Tüm temalar ve düzenler', 'Video arka plan', 'Gelişmiş efektler', 'Özel fontlar', 'Gelişmiş analitik', 'Özel alan adı'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="text-accent">✓</span>{t}</li>
              ))}
            </ul>
            <button disabled className="btn-primary mt-7 w-full opacity-60">Yakında</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Sıkça sorulan sorular</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-transparent to-transparent p-10 text-center md:p-16">
          <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]" />
          <h2 className="relative font-display text-3xl font-bold text-white sm:text-4xl">Profilini bugün oluştur</h2>
          <p className="relative mt-3 text-ink-100">Dakikalar içinde yayında.</p>
          <Link to="/register" className="btn-primary relative mt-7">B.io'nu oluştur <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-sm text-ink-300">Your identity. One link.</p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {[
                { h: 'Ürün', l: ['Özellikler', 'Fiyatlandırma', 'Keşfet', 'SSS'] },
                { h: 'Hesap', l: ['Giriş yap', 'Kayıt ol'] },
                { h: 'Yasal', l: ['Şartlar', 'Gizlilik', 'İletişim'] },
              ].map((c) => (
                <div key={c.h}>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{c.h}</h4>
                  <ul className="space-y-2 text-sm">
                    {c.l.map((i) => (
                      <li key={i}><a href="#" className="text-ink-100 transition hover:text-white">{i}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 border-t border-white/[0.05] pt-6 text-xs text-ink-300">
            © {new Date().getFullYear()} B.io. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}
