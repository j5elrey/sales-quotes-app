import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chrome, Apple, Mail, Lock } from 'lucide-react';

const Login = () => {
  const { signInWithGoogle, signInWithApple, signup, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (error) {
      setError('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    try {
      setLoading(true);
      setError("");
      await signup(email, password);
    } catch (error) {
      setError("Error al registrarse con correo y contraseña. Por favor, intenta de nuevo.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    try {
      setLoading(true);
      setError("");
      await login(email, password);
    } catch (error) {
      setError("Error al iniciar sesión con correo y contraseña. Por favor, intenta de nuevo.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithApple();
    } catch (error) {
      setError('Error al iniciar sesión con Apple. Por favor, intenta de nuevo.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Gestión de Ventas y Cotizaciones
          </CardTitle>
          <CardDescription className="text-center">
            Inicia sesión o regístrate para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">Correo Electrónico</Label>
                <Input
                  id="email-login"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">Contraseña</Label>
                <Input
                  id="password-login"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleEmailLogin} disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                Iniciar Sesión con Correo
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Correo Electrónico</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Contraseña</Label>
                <Input
                  id="password-signup"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleEmailSignup} disabled={loading}>
                <Lock className="mr-2 h-4 w-4" />
                Registrarse con Correo
              </Button>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                O continuar con
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            Continuar con Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleAppleSignIn}
            disabled={loading}
          >
            <Apple className="mr-2 h-4 w-4" />
            Continuar con Apple
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Al continuar, aceptas nuestros términos de servicio y política de privacidad
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;