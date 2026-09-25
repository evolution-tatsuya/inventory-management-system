// ============================================================
// Master API Service（運営者=master のテナント管理）
// ============================================================
// /api/master/* は client.ts の withTenant がslug注入をスキップするため
// パスをそのまま渡す。/api/tenants/activate は無認証（購入者用）。
// ============================================================

import { apiClient, get, post, put } from './client';
import type { Tenant } from '../../types';

// テナント一覧の各要素（件数サマリー・admin一覧付き）
export interface TenantAdmin {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  department: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TenantCount {
  categories: number;
  genres: number;
  units: number;
  parts: number;
}

export interface TenantListItem extends Tenant {
  _count: TenantCount;
  admins: TenantAdmin[];
  imageCount: number; // 画像枚数（Cloudinary容量の目安）
  imageMB?: number; // 概算容量（枚数×0.3MB。limitService の上限判定と同じ基準）
}

// 課金情報の更新リクエスト（すべて任意・渡した項目のみ更新）
export interface UpdateBillingRequest {
  plan?: string | null;
  monthlyFee?: number | null;
  billingStatus?: string | null;
  contractStartDate?: string | null;
  nextBillingDate?: string | null;
  billingNote?: string | null;
}

export interface TenantSummary {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  partTotal: number;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  stockMode?: 'shared' | 'perCategory';
  sourceCategoryId?: string;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  cloned: { categoryId: string; parts: number } | null;
}

// テナント一覧
export async function listTenants(): Promise<TenantListItem[]> {
  return get<TenantListItem[]>('/api/master/tenants');
}

// 全テナント横断サマリー
export async function getSummary(): Promise<TenantSummary> {
  return get<TenantSummary>('/api/master/summary');
}

// Cloudinary使用量
export interface CloudinaryUsage {
  plan: string;
  lastUpdated: string;
  storageGB: number;
  bandwidthGB: number;
  creditsUsed: number;
  creditsLimit: number;
  creditsPercent: number;
  resources: number;
  storageLimitGB: number;
  bandwidthLimitGB: number;
}

export async function getCloudinaryUsage(): Promise<CloudinaryUsage> {
  return get<CloudinaryUsage>('/api/master/cloudinary-usage');
}

// テナント使用量の推移
export interface UsageTrend {
  summary: {
    yesterdayAccess: number;
    todayAccess: number;
    thisMonthAccess: number;
    thisYearAccess: number;
  };
  daily: {
    date: string;
    accessCount: number;
    partCount: number;
    imageCount: number;
    imageMB: number;
  }[];
}

export async function getUsageTrend(id: string, days = 90): Promise<UsageTrend> {
  return get<UsageTrend>(`/api/master/tenants/${id}/usage-trend?days=${days}`);
}

// テナント詳細
export async function getTenantDetail(id: string): Promise<TenantListItem> {
  return get<TenantListItem>(`/api/master/tenants/${id}`);
}

// テナント発行
export async function createTenant(
  data: CreateTenantRequest,
): Promise<CreateTenantResponse> {
  return post<CreateTenantResponse>('/api/master/tenants', data);
}

// 状態変更（suspend/reactivate）
export async function setStatus(
  id: string,
  status: 'active' | 'suspended',
): Promise<Tenant> {
  return put<Tenant>(`/api/master/tenants/${id}/status`, { status });
}

// 契約/課金情報の更新
export async function updateBilling(
  id: string,
  data: UpdateBillingRequest,
): Promise<Tenant> {
  return put<Tenant>(`/api/master/tenants/${id}/billing`, data);
}

// 指定テナントに一般ユーザー(閲覧専用)を作成（運営者の代理作成）
export async function createTenantUser(
  id: string,
  data: { email: string; password: string; name?: string },
): Promise<{ success: boolean; user: { id: string; email: string; name: string | null } }> {
  return post(`/api/master/tenants/${id}/users`, data);
}

// ライセンスキー再発行
export async function regenerateKey(id: string): Promise<{ licenseKey: string }> {
  return post<{ licenseKey: string }>(`/api/master/tenants/${id}/regenerate-key`);
}

// 削除前バックアップ（全モデルJSON dump）
export async function getBackup(id: string): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>(`/api/master/tenants/${id}/backup`);
}

// テナント削除（多段階関門・confirmName必須）
export async function deleteTenant(
  id: string,
  confirmName: string,
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/api/master/tenants/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmName }),
  });
}

// ライセンスキー有効化（購入者用・無認証）
export async function activate(data: {
  licenseKey: string;
  email: string;
  password: string;
  name: string; // 登録者名（必須）
  companyName?: string;
  department?: string;
}): Promise<{ success: boolean; slug: string }> {
  return post<{ success: boolean; slug: string }>('/api/tenants/activate', data);
}
