import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, ArrowRight, Activity } from 'lucide-react';
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
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-background relative">
        {/* subtle bg pattern */}
        <div className="absolute inset-0 pattern-dots opacity-50" />

        <div className={`relative z-10 w-full max-w-[600px] px-6 md:px-14 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Mobile logo (visible on < lg) */}
          <div className="lg:hidden text-center mb-10">
            <div className="text-primary mx-auto mb-3">
              <RNCLogo size={64} />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Registre du Cancer</h1>
            <p className="text-muted-foreground text-sm mt-1">Wilaya de Tlemcen</p>
          </div>

          {/* Form header */}
          <div className="mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground tracking-tight">
              Bienvenue
            </h2>
            <p className="text-muted-foreground text-base mt-2">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-2xl border border-border/60 p-10 md:p-12 shadow-[0_8px_40px_-12px_hsl(215_30%_12%_/_0.1)]">
            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-medium mb-1">Adresse email</Label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="medecin@chu-tlemcen.dz"
                    required
                    className="pl-12 h-[52px] bg-muted/40 border-border/60 rounded-xl text-base placeholder:text-muted-foreground/40 focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-medium mb-1">Mot de passe</Label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-12 h-[52px] bg-muted/40 border-border/60 rounded-xl text-base placeholder:text-muted-foreground/40 focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-[52px] rounded-xl text-base font-semibold gap-2 bg-gradient-to-r from-primary to-[hsl(200,75%,50%)] hover:from-primary/90 hover:to-[hsl(200,75%,45%)] shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground/60 text-center mt-6 leading-relaxed">
            Contactez l'administrateur pour obtenir vos identifiants
            <br />
            <span className="text-muted-foreground/40">Conforme Loi 18-07 & 25-11 ANPDP</span>
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
