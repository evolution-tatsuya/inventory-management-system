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
  role: string;
  createdAt: string;
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
  name?: string;
}): Promise<{ success: boolean; slug: string }> {
  return post<{ success: boolean; slug: string }>('/api/tenants/activate', data);
}
