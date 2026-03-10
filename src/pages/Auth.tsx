import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, ArrowRight, Activity, Shield, Fingerprint } from 'lucide-react';
import RNCLogo from '@/components/RNCLogo';

/* ───── floating particle component ───── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0
              ? 'hsl(213 80% 55%)'
              : i % 3 === 1
                ? 'hsl(170 60% 42%)'
                : 'hsl(200 75% 52%)',
            animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 8}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Auth() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Connexion réussie');
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex">
      {/* ─── LEFT PANEL — hero branding ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215,32%,10%)] via-[hsl(213,80%,20%)] to-[hsl(170,60%,18%)]" />

        {/* animated mesh overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, hsl(213 80% 45% / 0.4) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, hsl(170 60% 42% / 0.3) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, hsl(200 75% 52% / 0.2) 0%, transparent 60%)
              `,
            }}
          />
        </div>

        {/* grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <Particles />

        {/* Content */}
        <div className={`relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo & title */}
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              <div className="text-white">
                <RNCLogo size={46} />
              </div>
              <div>
                <p className="text-white/90 font-display font-bold text-lg tracking-tight">RNC Tlemcen</p>
                <p className="text-white/50 text-[11px] tracking-wider uppercase">MSPRH — République Algérienne</p>
              </div>
            </div>
          </div>

          {/* center hero text */}
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 text-xs">
              <Activity size={12} className="text-emerald-400" />
              Plateforme Sécurisée — Conforme ANPDP
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Registre National
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-cyan-300 to-emerald-300">
                du Cancer
              </span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-md">
              Wilaya de Tlemcen — Système intégré de suivi épidémiologique,
              d'enregistrement et d'analyse des cas de cancer.
            </p>

            {/* Stats preview */}
            <div className="flex gap-6 pt-4">
              {[
                { label: 'Standards', value: 'IARC/OMS' },
                { label: 'Sécurité', value: 'Loi 18-07' },
                { label: 'Hébergement', value: 'Algérie 🇩🇿' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-white font-display font-bold text-sm">{s.value}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* footer */}
          <p className="text-white/30 text-[11px]">
            © 2026 Ministère de la Santé — Tous droits réservés
          </p>
        </div>
      </div>

      {/* ─── RIGHT PANEL — login form ─── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center relative overflow-hidden bg-background">
        {/* decorative gradient orbs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/[0.07] via-cyan-400/[0.05] to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-400/[0.06] via-blue-400/[0.04] to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-primary/[0.03] to-transparent blur-3xl" />

        {/* fine grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className={`relative z-10 w-full max-w-[400px] px-6 md:px-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="text-primary mx-auto mb-3">
              <RNCLogo size={64} />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Registre du Cancer</h1>
            <p className="text-muted-foreground text-sm mt-1">Wilaya de Tlemcen</p>
          </div>

          {/* Form header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/[0.08] text-primary text-[11px] font-medium mb-4 border border-primary/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Système opérationnel
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground tracking-tight leading-tight">
              Connexion sécurisée
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              Accédez à votre espace du registre national
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border/60 p-6 shadow-[0_1px_1px_hsl(0_0%_0%/0.04),0_4px_8px_hsl(0_0%_0%/0.04),0_16px_32px_hsl(0_0%_0%/0.04),0_32px_64px_hsl(0_0%_0%/0.02)] ring-1 ring-border/10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Email</Label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none">
                    <div className="w-7 h-7 rounded-md bg-primary/[0.06] group-focus-within:bg-primary/[0.12] flex items-center justify-center transition-colors duration-200">
                      <Mail size={13} className="text-primary/60 group-focus-within:text-primary transition-colors duration-200" />
                    </div>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="medecin@chu-tlemcen.dz"
                    required
                    className="pl-12 h-10 bg-muted/50 border-border/60 rounded-lg text-sm placeholder:text-muted-foreground/35 focus:bg-background focus:border-primary/30 focus:ring-[3px] focus:ring-primary/[0.08] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Mot de passe</Label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none">
                    <div className="w-7 h-7 rounded-md bg-primary/[0.06] group-focus-within:bg-primary/[0.12] flex items-center justify-center transition-colors duration-200">
                      <Lock size={13} className="text-primary/60 group-focus-within:text-primary transition-colors duration-200" />
                    </div>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-12 h-10 bg-muted/50 border-border/60 rounded-lg text-sm placeholder:text-muted-foreground/35 focus:bg-background focus:border-primary/30 focus:ring-[3px] focus:ring-primary/[0.08] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="pt-0.5">
                <Button
                  type="submit"
                  className="w-full h-10 rounded-lg text-sm font-semibold gap-2 bg-gradient-to-r from-primary to-[hsl(200,75%,50%)] hover:from-primary/90 hover:to-[hsl(200,75%,45%)] text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-[1px] active:translate-y-0"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-5">
            <div className="flex items-center gap-1.5 text-muted-foreground/45">
              <Shield size={13} />
              <span className="text-[11px] font-medium">Loi 18-07</span>
            </div>
            <div className="w-px h-3 bg-border/60" />
            <div className="flex items-center gap-1.5 text-muted-foreground/45">
              <Fingerprint size={13} />
              <span className="text-[11px] font-medium">Chiffrement AES-256</span>
            </div>
            <div className="w-px h-3 bg-border/60" />
            <div className="flex items-center gap-1.5 text-muted-foreground/45">
              <Lock size={12} />
              <span className="text-[11px] font-medium">ANPDP</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/35 text-center mt-4">
            Contactez l'administrateur pour obtenir vos identifiants
          </p>
        </div>
      </div>

      {/* ─── CSS keyframes ─── */}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          25% { transform: translate(30px, -40px) scale(1.3); opacity: 0.35; }
          50% { transform: translate(-20px, -80px) scale(0.9); opacity: 0.15; }
          75% { transform: translate(40px, -30px) scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
