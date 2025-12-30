import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { adminService } from '../../services/adminService';
import { subscriptionAdminService, AdminPlan, UserSubscriptionInfo } from '../../services/subscriptionAdminService';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  subscriptionEndDate?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  
  // Abonelik atama modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscriptionInfo | null>(null);
  const [assigningSubscription, setAssigningSubscription] = useState(false);

  useEffect(() => {
    loadUsers();
    loadPlans();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await adminService.getAllUsers();
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const plansData = await subscriptionAdminService.getAll();
      setPlans(plansData.filter(p => p.isActive));
    } catch (err) {
      console.error('Planlar yüklenirken hata:', err);
    }
  };

  const openSubscriptionModal = async (user: User) => {
    setSelectedUser(user);
    setSelectedPlanId(null);
    setShowSubscriptionModal(true);
    
    try {
      const subInfo = await subscriptionAdminService.getUserSubscription(user.id);
      setUserSubscription(subInfo);
    } catch (err) {
      setUserSubscription(null);
    }
  };

  const handleAssignSubscription = async () => {
    if (!selectedUser || !selectedPlanId) return;
    
    try {
      setAssigningSubscription(true);
      await subscriptionAdminService.assignSubscription(selectedUser.id, selectedPlanId);
      alert('Abonelik başarıyla atandı!');
      setShowSubscriptionModal(false);
      setSelectedUser(null);
      setSelectedPlanId(null);
    } catch (err) {
      alert('Abonelik atanırken hata oluştu');
    } finally {
      setAssigningSubscription(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminService.toggleUserStatus(userId);
      setUsers(users.map(user =>
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ));
    } catch (err) {
      alert('Kullanıcı durumu güncellenirken hata oluştu');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      alert('Kullanıcı rolü güncellenirken hata oluştu');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;

    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      alert('Kullanıcı silinirken hata oluştu');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading) return <LoadingState message="Kullanıcılar yükleniyor..." />;
  if (error) return <ErrorState description={error} onRetry={loadUsers} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600 mt-2">Sistem kullanıcılarını yönetin</p>
        </div>
        <Button onClick={loadUsers} variant="outline" className="font-medium">
          Yenile
        </Button>
      </div>

      {/* Filtreler */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Tüm Roller</option>
            <option value="User">Kullanıcı</option>
            <option value="Admin">Admin</option>
            <option value="SuperAdmin">Super Admin</option>
          </select>
        </div>
      </Card>

      {/* Kullanıcı Listesi */}
      <Card className="p-6">
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'SuperAdmin' ? 'bg-red-100 text-red-800' :
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Oluşturulma: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    {user.lastLoginAt && ` • Son giriş: ${new Date(user.lastLoginAt).toLocaleDateString('tr-TR')}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                  </select>

                  <Button
                    onClick={() => openSubscriptionModal(user)}
                    variant="outline"
                    size="sm"
                    className="font-medium"
                  >
                    Abonelik
                  </Button>

                  <Button
                    onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                    variant={user.isActive ? "destructive" : "default"}
                    size="sm"
                    className="font-medium"
                  >
                    {user.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  </Button>

                  <Button
                    onClick={() => handleDeleteUser(user.id)}
                    variant="destructive"
                    size="sm"
                    className="font-medium"
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || selectedRole !== 'all' ? 'Filtreye uygun kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
            </div>
          )}
        </div>
      </Card>

      {/* Abonelik Atama Modal */}
      {showSubscriptionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <h3 className="text-xl font-semibold mb-4">Abonelik Yönetimi</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Kullanıcı:</p>
              <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            {userSubscription && userSubscription.planName && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Mevcut Abonelik:</p>
                <p className="font-medium text-blue-700">{userSubscription.planName}</p>
                {userSubscription.endDate && (
                  <p className="text-xs text-gray-500">
                    Bitiş: {new Date(userSubscription.endDate).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Abonelik Planı Seçin:
              </label>
              <select
                value={selectedPlanId || ''}
                onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Plan Seçin...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.price}₺ {plan.validityDays ? `(${plan.validityDays} gün)` : '(Süresiz)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSelectedUser(null);
                  setUserSubscription(null);
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleAssignSubscription}
                disabled={!selectedPlanId || assigningSubscription}
              >
                {assigningSubscription ? 'Atanıyor...' : 'Abonelik Ata'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
