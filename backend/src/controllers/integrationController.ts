// ============================================================
// integrationController: EC連携API
// ============================================================
// EC（多機能ECプラットフォーム）が決済確定後に叩く。
// 注文からテナントを発行し、ライセンスキー/有効化URLを返す（冪等）。
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenantService';
import { validateEmail } from '../utils/validators';

const ALLOWED_BILLING = ['monthly', 'yearly', 'onetime'];

export const integrationController = {
  // POST /api/integration/provision
  async provision(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, email, plan, billingType, productId, limits } = req.body;

      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ error: 'orderId は必須です' });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'メールアドレスの形式が不正です' });
      }
      if (billingType && !ALLOWED_BILLING.includes(billingType)) {
        return res
          .status(400)
          .json({ error: 'billingType は monthly / yearly / onetime のいずれか' });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3589';
      const result = await tenantService.provisionFromOrder({
        orderId: orderId.trim(),
        email: email.trim(),
        plan: plan?.trim() || undefined,
        billingType: billingType || undefined,
        productId: productId || undefined,
        limits: limits || undefined,
        frontendUrl,
      });

      // 既存発行なら 200、新規なら 201
      res.status(result.alreadyProvisioned ? 200 : 201).json({
        success: true,
        ...result,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // POST /api/integration/plan-change - 既存テナントのプラン変更（上/下）
  async planChange(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, slug, plan, billingType, productId, limits } = req.body;
      if (!orderId && !slug) {
        return res.status(400).json({ error: 'orderId または slug が必要です' });
      }
      if (billingType && !ALLOWED_BILLING.includes(billingType)) {
        return res
          .status(400)
          .json({ error: 'billingType は monthly / yearly / onetime のいずれか' });
      }
      const result = await tenantService.changePlan({
        orderId,
        slug,
        plan,
        billingType,
        productId,
        limits,
      });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },
};
