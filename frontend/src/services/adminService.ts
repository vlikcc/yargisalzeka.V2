import { httpClient } from './httpClient';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  recentUsers: number;
  inactiveUsers: number;
}

export interface UserDto {
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

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  services: {
    name: string;
    status: 'up' | 'down' | 'unknown';
    responseTime?: number;
    lastCheck: string;
    url?: string;
  }[];
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
  timestamp: string;
}

export interface SearchStats {
  totalSearches: number;
  periodSearches: number;
  uniqueUsers: number;
  avgResults: number;
  dailySearches: { date: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
}

export interface LoginLog {
  id: number;
  userId: string;
  email: string;
  isSuccess: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LoginStats {
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: number;
  dailyStats: { date: string; successCount: number; failCount: number }[];
  failureReasons: { reason: string; count: number }[];
  suspiciousIps: { ipAddress: string; failCount: number }[];
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
  showOnDashboard: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  type: string;
  showOnDashboard: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface RevenueStats {
  totalRevenue: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  newSubscriptions: number;
  revenueByPlan: { planName: string; subscriptionCount: number; revenue: number }[];
  dailyRevenue: { date: string; count: number; revenue: number }[];
}

export interface SubscriptionStats {
  planDistribution: { plan: string; count: number }[];
  dailyNewSubs: { date: string; count: number }[];
  expiringSubscriptions: { userId: string; planName: string; endDate: string }[];
  expiringCount: number;
}

export interface RecentSubscription {
  id: number;
  userId: string;
  planName: string;
  price: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface UpdateRoleRequest {
  role: string;
}

class AdminService {
  private readonly baseUrl = '/auth';

  // Admin istatistikleri
  async getAdminStats(): Promise<AdminStats> {
  const data = await httpClient.get<AdminStats>(`${this.baseUrl}/admin-stats`);
  return data;
  }

  // Tüm kullanıcıları listele
  async getAllUsers(): Promise<UserDto[]> {
  const data = await httpClient.get<UserDto[]>(`${this.baseUrl}/users`);
  return data;
  }

  // Kullanıcı rolünü güncelle
  async updateUserRole(userId: string, role: string): Promise<void> {
    await httpClient.put(`${this.baseUrl}/users/${userId}/role`, { role });
  }

  // Kullanıcı durumunu değiştir (aktif/pasif)
  async toggleUserStatus(userId: string): Promise<void> {
    await httpClient.put(`${this.baseUrl}/users/${userId}/status`);
  }

  // Kullanıcı sil
  async deleteUser(userId: string): Promise<void> {
    await httpClient.delete(`${this.baseUrl}/users/${userId}`);
  }

  // Arama istatistikleri
  async getSearchStats(days: number = 30): Promise<SearchStats> {
    return await httpClient.get<SearchStats>(`/search/admin/stats?days=${days}`);
  }

  // Giriş logları
  async getLoginLogs(take: number = 100, skip: number = 0, success?: boolean): Promise<{ logs: LoginLog[]; totalCount: number }> {
    let url = `${this.baseUrl}/login-logs?take=${take}&skip=${skip}`;
    if (success !== undefined) {
      url += `&success=${success}`;
    }
    return await httpClient.get<{ logs: LoginLog[]; totalCount: number }>(url);
  }

  // Giriş istatistikleri
  async getLoginStats(days: number = 30): Promise<LoginStats> {
    return await httpClient.get<LoginStats>(`${this.baseUrl}/login-stats?days=${days}`);
  }

  // Duyurular - Aktif olanlar (herkese açık)
  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await httpClient.get<Announcement[]>(`${this.baseUrl}/announcements`);
  }

  // Duyurular - Admin için tümü
  async getAllAnnouncements(): Promise<Announcement[]> {
    return await httpClient.get<Announcement[]>(`${this.baseUrl}/admin/announcements`);
  }

  // Duyuru oluştur
  async createAnnouncement(data: CreateAnnouncementRequest): Promise<void> {
    await httpClient.post(`${this.baseUrl}/admin/announcements`, data);
  }

  // Duyuru güncelle
  async updateAnnouncement(id: number, data: CreateAnnouncementRequest): Promise<void> {
    await httpClient.put(`${this.baseUrl}/admin/announcements/${id}`, data);
  }

  // Duyuru aktif/pasif
  async toggleAnnouncement(id: number): Promise<void> {
    await httpClient.put(`${this.baseUrl}/admin/announcements/${id}/toggle`);
  }

  // Duyuru sil
  async deleteAnnouncement(id: number): Promise<void> {
    await httpClient.delete(`${this.baseUrl}/admin/announcements/${id}`);
  }

  // Gelir istatistikleri
  async getRevenueStats(days: number = 30): Promise<RevenueStats> {
    return await httpClient.get<RevenueStats>(`/subscription/admin/reports/revenue?days=${days}`);
  }

  // Abonelik istatistikleri
  async getSubscriptionStats(days: number = 30): Promise<SubscriptionStats> {
    return await httpClient.get<SubscriptionStats>(`/subscription/admin/reports/subscriptions?days=${days}`);
  }

  // Son abonelikler
  async getRecentSubscriptions(take: number = 50): Promise<RecentSubscription[]> {
    return await httpClient.get<RecentSubscription[]>(`/subscription/admin/reports/recent-subscriptions?take=${take}`);
  }

  // Sistem durumu kontrolü - Backend'den gerçek health check verisi al
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const data = await httpClient.get<SystemHealth>('/admin/system-health');
      return data;
    } catch (error) {
      console.error('System health check failed:', error);
      // Fallback: sadece API Gateway'i kontrol et
      const gatewayBase = (await import('../config/api')).API_CONFIG.BASE_URL.replace(/\/$/, '');
        try {
          const startTime = Date.now();
        const response = await fetch(`${gatewayBase}/health`, {
            method: 'GET',
          signal: AbortSignal.timeout(5000)
          });
          const responseTime = Date.now() - startTime;
          return {
          status: response.ok ? 'warning' : 'error',
          services: [{
            name: 'API Gateway',
            status: response.ok ? 'up' : 'down',
            responseTime,
            lastCheck: new Date().toISOString(),
            url: `${gatewayBase}/health`
          }]
          };
      } catch {
        return { status: 'error', services: [] };
        }
    }
  }

  // Servis health check (SystemMonitoring sayfası için)
  async getServiceHealth(): Promise<SystemHealth> {
    return this.getSystemHealth();
  }

  // Sistem metrikleri
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Bu gerçek bir sistem metrik servisi simülasyonu
      // Gerçek projede Prometheus, Grafana veya sistem monitoring araçları kullanılmalı
      return {
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        diskUsage: Math.floor(Math.random() * 100),
        uptime: '7 gün 14 saat',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('System metrics fetch failed:', error);
      throw new Error('Sistem metrikleri alınamadı');
    }
  }

  // Servis yönetimi
  async restartService(serviceName: string): Promise<void> {
    try {
      // Bu gerçek bir servis restart işlemi simülasyonu
      // Gerçek projede Docker API veya sistem yönetim araçları kullanılmalı
      console.log(`Restarting service: ${serviceName}`);

      // Simülasyon için bekletme
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Gerçek implementasyon için:
      // await httpClient.post(`/admin/services/${serviceName}/restart`);
    } catch (error) {
      console.error(`Service restart failed: ${serviceName}`, error);
      throw new Error(`${serviceName} servisi yeniden başlatılamadı`);
    }
  }

  // Logları al
  async getSystemLogs(serviceName?: string, lines: number = 100): Promise<string[]> {
    try {
      // Bu gerçek bir log alma işlemi simülasyonu
      // Gerçek projede log aggregation sistemleri kullanılmalı
      const logs = [
        '[2024-01-15 10:30:15] INFO - User login successful: user@example.com',
        '[2024-01-15 10:29:42] INFO - Search query executed: "yasal süreç"',
        '[2024-01-15 10:28:33] WARN - High memory usage detected',
        '[2024-01-15 10:27:18] INFO - Document generated successfully',
        '[2024-01-15 10:26:05] ERROR - Database connection timeout'
      ];

      return logs.slice(0, lines);
    } catch (error) {
      console.error('System logs fetch failed:', error);
      throw new Error('Sistem logları alınamadı');
    }
  }

  // Backup işlemleri
  async createBackup(): Promise<{ backupId: string; status: string }> {
    try {
      // Bu gerçek bir backup işlemi simülasyonu
      // Gerçek projede backup sistemleri kullanılmalı
      console.log('Creating system backup...');

      // Simülasyon için bekletme
      await new Promise(resolve => setTimeout(resolve, 5000));

      return {
        backupId: `backup_${Date.now()}`,
        status: 'completed'
      };
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Backup oluşturulamadı');
    }
  }

  // Backup listesi
  async getBackups(): Promise<Array<{ id: string; createdAt: string; size: string; status: string }>> {
    try {
      // Bu gerçek bir backup listesi simülasyonu
      return [
        { id: 'backup_1705300000000', createdAt: '2024-01-15 10:00:00', size: '2.5 GB', status: 'completed' },
        { id: 'backup_1705290000000', createdAt: '2024-01-15 08:00:00', size: '2.3 GB', status: 'completed' },
        { id: 'backup_1705280000000', createdAt: '2024-01-15 06:00:00', size: '2.1 GB', status: 'completed' }
      ];
    } catch (error) {
      console.error('Backups fetch failed:', error);
      throw new Error('Backup listesi alınamadı');
    }
  }
}

export const adminService = new AdminService();
