import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Profil</h2>
      {user ? (
        <div className="p-4 border rounded bg-white space-y-1 text-sm">
          <div>ID: {user.id}</div>
          <div>Email: {user.email}</div>
          {user.firstName && <div>Ad: {user.firstName}</div>}
          {user.lastName && <div>Soyad: {user.lastName}</div>}
          <button onClick={logout} className="mt-2 bg-red-600 text-white px-3 py-2 rounded text-xs">Çıkış Yap</button>
        </div>
      ) : <div>Oturum yok</div>}
    </div>
  );
}
