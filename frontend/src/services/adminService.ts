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

  // Sistem durumu kontrolü
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Paralel olarak tüm servislerin health check'ini yap
      // Only check API Gateway health via configured BASE_URL to avoid CORS and direct service port access
      const gatewayBase = (await import('../config/api')).API_CONFIG.BASE_URL.replace(/\/$/, '');
      const services: Array<{ name: string; url: string }> = [
        { name: 'API Gateway', url: `${gatewayBase}/health` },
      ];

      const servicePromises = services.map(async (service) => {
        try {
          const startTime = Date.now();
          const response = await fetch(service.url, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 saniye timeout
          });

          const responseTime = Date.now() - startTime;
          const status = (response.ok ? 'up' : 'down') as 'up' | 'down';

          return {
            ...service,
            status,
            responseTime,
            lastCheck: new Date().toISOString()
          };
        } catch (error) {
          return {
            ...service,
            status: 'down' as const,
            lastCheck: new Date().toISOString()
          };
        }
      });

  const results = await Promise.all(servicePromises);

      // Genel durumu belirle
      const downServices = results.filter(s => s.status === 'down').length;
      const status: SystemHealth['status'] =
        downServices === 0 ? 'healthy' :
        downServices <= 2 ? 'warning' : 'error';

      return {
        status,
  services: results
      };
    } catch (error) {
      console.error('System health check failed:', error);
      return {
        status: 'error',
        services: []
      };
    }
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
