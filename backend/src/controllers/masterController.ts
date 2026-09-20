// ============================================================
// masterController: 運営者(master)のテナント管理
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenantService';
import { validateEmail, validatePassword } from '../utils/validators';

export const masterController = {
  // テナント一覧
  async listTenants(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await tenantService.listTenants());
    } catch (e) {
      next(e);
    }
  },

  // 全テナント横断サマリー
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await tenantService.getSummary());
    } catch (e) {
      next(e);
    }
  },

  // テナント詳細（顧客の登録状況を確認）
  async getTenantDetail(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await tenantService.getTenantDetail(req.params.id));
    } catch (e) {
      next(e);
    }
  },

  // テナント発行
  async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, slug, stockMode, sourceCategoryId } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: 'name と slug は必須です' });
      }
      if (stockMode && stockMode !== 'shared' && stockMode !== 'perCategory') {
        return res.status(400).json({ error: 'stockMode が不正です' });
      }
      const result = await tenantService.createTenant({ name, slug, stockMode, sourceCategoryId });
      res.status(201).json(result);
    } catch (e: any) {
      // slug重複などの業務エラーは400で返す
      res.status(400).json({ error: e.message });
    }
  },

  // 状態変更（suspend/reactivate）
  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      if (status !== 'active' && status !== 'suspended') {
        return res.status(400).json({ error: 'status は active か suspended' });
      }
      res.json(await tenantService.setStatus(req.params.id, status));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // 契約/課金情報の更新
  async updateBilling(req: Request, res: Response, next: NextFunction) {
    try {
      const { plan, monthlyFee, billingStatus, contractStartDate, nextBillingDate, billingNote } =
        req.body;
      res.json(
        await tenantService.updateBilling(req.params.id, {
          plan,
          monthlyFee,
          billingStatus,
          contractStartDate,
          nextBillingDate,
          billingNote,
        }),
      );
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // ライセンスキー再発行
  async regenerateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const t = await tenantService.regenerateKey(req.params.id);
      res.json({ licenseKey: t.licenseKey });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // 削除前バックアップ（JSON全モデル）
  async backup(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await tenantService.exportTenantBackup(req.params.id));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // テナント削除（多段階関門。confirmName 必須）
  async deleteTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { confirmName } = req.body;
      if (!confirmName) {
        return res.status(400).json({ error: '確認のためテナント名が必要です' });
      }
      res.json(await tenantService.deleteTenant(req.params.id, confirmName));
    } catch (e: any) {
      // suspended以外/名前不一致/既定テナント は業務エラー
      res.status(400).json({ error: e.message });
    }
  },

  // ライセンスキー有効化（購入者用・無認証）
  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const { licenseKey, email, password, name } = req.body;
      if (!licenseKey) {
        return res.status(400).json({ error: 'ライセンスキーが必要です' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'メールアドレスの形式が不正です' });
      }
      if (!validatePassword(password)) {
        return res.status(400).json({ error: 'パスワードの形式が不正です' });
      }
      const result = await tenantService.activate({ licenseKey, email, password, name });
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },
};
