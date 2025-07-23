import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export function SignIn({ onSignIn }: { onSignIn: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let email = username.trim();
    if (!email.includes('@')) {
      email = `${email}@khilao.com`;
    }
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      onSignIn();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-blue-400 to-blue-100">
      <div className="flex flex-col items-center w-full">
        {/* Branding */}
        <div className="mb-6 flex flex-col items-center">
          {/* Replace with your logo if available */}
          <div className="bg-primary-600 rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <span className="text-white text-3xl font-bold">K</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-1 bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">Khilao</h1>
          <p className="text-gray-500 text-sm mb-2">Restaurant Management Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-xs space-y-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Sign In</h2>
          <input
            className="input w-full"
            placeholder="Username or Email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            className="input w-full"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
} 