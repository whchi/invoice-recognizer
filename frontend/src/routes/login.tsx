import { Button } from '@frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@frontend/components/ui/card';
import { Input } from '@frontend/components/ui/input';
import { Label } from '@frontend/components/ui/label';
import { useAuth } from '@frontend/hooks/use-auth';
import { authClient } from '@frontend/lib/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FileText, Shield, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    authClient.signIn.social({ provider: 'google', callbackURL: '/' });
  };

  const features = [
    { icon: FileText, label: '10M+', desc: 'Documents processed' },
    { icon: Zap, label: '<10s', desc: 'Average processing time' },
    { icon: Shield, label: 'SOC 2', desc: 'Enterprise security' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Content (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-muted/50">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">InvoiceAI</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-6 leading-[1.1] max-w-lg">
              Extract invoice data with AI precision
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Join thousands of businesses automating their document processing with our intelligent extraction engine.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-lg">
            {features.map((feature, i) => (
              <div
                key={feature.label}
                className="group p-4 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-background/80 transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-bold text-foreground">{feature.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">InvoiceAI</span>
          </div>

          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome back
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-2">Enter your credentials to access your dashboard</p>
          </div>

          <Card className="border-border/50 shadow-lg shadow-black/5">
            <CardContent className="pt-6 space-y-6">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <Input
                    disabled={isLoading}
                    id="email"
                    name="email"
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    type="email"
                    value={email}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    disabled={isLoading}
                    id="password"
                    name="password"
                    onChange={e => setPassword(e.target.value)}
                    required
                    type="password"
                    value={password}
                    className="h-11"
                  />
                </div>
                {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
                <Button className="w-full h-11" disabled={isLoading} type="submit">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                className="w-full h-11 gap-2"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                type="button"
                variant="outline"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-label="Google logo">
                  <title>Google</title>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              className="font-medium text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Contact sales
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
