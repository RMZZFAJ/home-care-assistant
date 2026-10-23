import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin } from "@/lib/server/app-origin";
import { exactQuantity } from "@/lib/validation/documents";
import { quantity } from "@/lib/quantity";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  requireGlobal,
  rpc,
  uuid,
} from "@/lib/server/api";

const role = z.enum([
  "admin",
  "supervisor",
  "professional",
  "family",
  "reader",
]);
const category = z.enum(["medicamentos", "higiene", "dieta"]);
const unit = z.string().trim().min(1).max(30);
const location = z.enum(["FAMILY", "CARE_TEAM"]);
const historicalStock = z
  .number()
  .int()
  .min(0)
  .max(100_000)
  .nullable()
  .default(null);
const historicalRow = z
  .object({
    physicalProtocol: z.number().int().min(1).max(11),
    careRecipientId: uuid,
    createdAt: z.string().datetime().nullable().optional(),
    requesterName: z.string().trim().min(1).max(160).nullable().optional(),
    status: z
      .enum([
        "draft",
        "submitted",
        "under_review",
        "approved",
        "separated",
        "delivered",
        "cancelled",
      ])
      .nullable()
      .optional(),
    lines: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(120),
            currentStock: historicalStock,
            urgent: z.boolean().default(false),
          })
          .strict(),
      )
      .max(1000)
      .default([]),
    extraItems: z
      .array(
        z
          .object({
            customName: z.string().trim().min(1).max(200),
            currentStock: historicalStock,
            urgent: z.boolean().default(false),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    observations: z
      .array(z.string().trim().min(1).max(1000))
      .max(50)
      .default([]),
  })
  .strict()
  .refine((row) => row.lines.length + row.extraItems.length > 0, {
    message: "Informe ao menos um item documentado na fonte.",
    path: ["lines"],
  });
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("profile"),
      userId: uuid,
      fullName: z.string().trim().min(2).max(160),
      role,
      status: z.enum(["active", "revoked"]),
      globalScope: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("recipient"),
      id: uuid.nullable(),
      displayName: z.string().trim().min(2).max(160),
      isActive: z.boolean(),
      isDevelopment: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("product"),
      careRecipientId: uuid,
      id: z.string().min(1).max(120).nullable(),
      name: z.string().trim().min(2).max(160),
      category,
      unit,
      aliases: z.array(z.string().trim().min(1).max(160)).max(30),
      isActive: z.boolean(),
      description: z.string().trim().max(2000).nullable().optional(),
      sortOrder: z.number().int().min(0).max(1_000_000).default(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("adoptProduct"),
      careRecipientId: uuid,
      productId: z.string().min(1).max(120),
    })
    .strict(),
  z
    .object({
      action: z.literal("membership"),
      careRecipientId: uuid,
      userId: uuid,
      role,
      canManageStock: z.boolean(),
      canCountStock: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("membershipStatus"),
      careRecipientId: uuid,
      userId: uuid,
      status: z.enum(["active", "revoked"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("invitation"),
      careRecipientId: uuid,
      email: z.string().trim().email().max(254),
      role,
      canManageStock: z.boolean(),
      canCountStock: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.enum(["revokeInvitation", "resendInvitation"]),
      careRecipientId: uuid,
      invitationId: uuid,
    })
    .strict(),
  z
    .object({
      action: z.literal("alertRule"),
      careRecipientId: uuid,
      productId: z.string().min(1).max(120),
      location,
      lowThreshold: exactQuantity,
      criticalThreshold: exactQuantity,
      isEnabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("notificationRecipient"),
      careRecipientId: uuid,
      recipientUserId: uuid,
      recipientGroup: z.enum(["family", "supervision", "care_team", "other"]),
      channel: z.enum(["internal", "whatsapp", "email"]),
      destination: z.string().trim().max(254).default(""),
      includeTeamAlerts: z.boolean().default(false),
      isEnabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("historicalImport"),
      rows: z.array(historicalRow).min(1).max(1000),
      preview: z.boolean().default(true),
    })
    .strict(),
]);

export async function GET(request: Request) {
  return api("admin.read", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const section = params.get("section") ?? "recipients";
    if (section === "profiles") {
      requireGlobal(auth);
      return NextResponse.json({
        data: (await rpc(auth.client, "admin_list_profiles")) ?? [],
      });
    }
    if (section === "recipients") {
      if (auth.isGlobalAdmin) {
        const workspace = await rpc(auth.client, "my_workspace") as { patients: unknown[] };
        return NextResponse.json({ data: workspace.patients });
      }
      const { data, error } = await auth.client
        .from("care_recipients")
        .select("*")
        .order("display_name");
      if (error) databaseError(error);
      return NextResponse.json({ data: data ?? [] });
    }
    if (auth.isGlobalAdmin) return NextResponse.json({ data: await rpc(auth.client, "global_patient_administration", { p_patient: uuid.parse(params.get("careRecipientId")), p_section: section }) });
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "manage",
    );
    if (section === "memberships") {
      const members = (await rpc(auth.client, "admin_list_memberships", {
        p_care_recipient_id: patient.id,
      })) as Array<Record<string, unknown>> | null;
      return NextResponse.json({
        data: (members ?? []).map((member) => ({
          ...member,
          profiles: { full_name: member.full_name },
        })),
      });
    }
    if (section === "products") {
      const { data, error } = await auth.client
        .from("products")
        .select("id,name,category,unit,aliases,is_active")
        .is("owner_care_recipient_id", null)
        .eq("is_active", true)
        .order("name");
      if (error) databaseError(error);
      return NextResponse.json({ data: data ?? [] });
    }
    if (section === "alerts") {
      const [rules, events] = await Promise.all([
        auth.client
          .from("stock_alert_rules")
          .select("*")
          .eq("care_recipient_id", patient.id),
        auth.client
          .from("stock_alert_events")
          .select("*")
          .eq("care_recipient_id", patient.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (rules.error) databaseError(rules.error);
      if (events.error) databaseError(events.error);
      return NextResponse.json({
        data: rules.data ?? [],
        events: events.data ?? [],
      });
    }
    const query =
      section === "invitations"
        ? auth.client
            .from("care_recipient_invitations")
            .select(
              "id,care_recipient_id,email,role,can_manage_stock,can_count_stock,status,expires_at,created_at,accepted_at",
            )
            .eq("care_recipient_id", patient.id)
            .order("created_at", { ascending: false })
        : section === "catalog"
          ? auth.client
              .from("care_recipient_products")
              .select("*")
              .eq("care_recipient_id", patient.id)
              .order("sort_order")
              .order("name")
          : section === "audit"
            ? auth.client
                .from("audit_events")
                .select(
                  "id,actor_id,action,entity_type,entity_id,metadata,created_at",
                )
                .eq("metadata->>care_recipient_id", patient.id)
                .order("created_at", { ascending: false })
                .limit(100)
            : section === "notificationRecipients"
              ? auth.client
                  .from("recipient_notification_settings")
                  .select("*")
                  .eq("care_recipient_id", patient.id)
              : null;
    if (!query)
      throw new ApiError("VALIDATION_ERROR", "Seção administrativa inválida.");
    const { data, error } = await query;
    if (error) databaseError(error);
    return NextResponse.json({
      data:
        section === "catalog"
          ? (data ?? []).map((item) => ({ ...item, id: item.product_id }))
          : (data ?? []),
    });
  });
}

export async function POST(request: Request) {
  return api("admin.write", async () => {
    const input = await readJson(request, schema, 2_000_000);
    const auth = await authenticate();
    if (auth.isGlobalAdmin && ["membership", "product", "adoptProduct", "membershipStatus", "alertRule", "notificationRecipient", "recipient"].includes(input.action)) {
      const target = "careRecipientId" in input ? input.careRecipientId : "id" in input ? input.id : null;
      if (target) {
        const governance = await rpc(auth.client, "patient_governance", { p_patient: target }) as { data: { version: number } };
        const data = await rpc(auth.client, "configure_patient_access", { p_patient: target, p_kind: input.action === "membership" ? "membership" : "administration", p_change: input.action === "membership" ? { userId: input.userId, role: input.role } : { operation: input.action, args: input }, p_key: crypto.randomUUID(), p_version: governance.data.version });
        return NextResponse.json({ data, pendingApproval: true });
      }
    }
    if (input.action === "profile") {
      requireGlobal(auth);
      return NextResponse.json({
        data: await rpc(auth.client, "admin_set_profile", {
          p_user_id: input.userId,
          p_full_name: input.fullName,
          p_role: input.role,
          p_status: input.status,
          p_global_scope: input.globalScope,
        }),
      });
    }
    if (input.action === "recipient") {
      if (input.id) await patientContext(auth, input.id, "manage");
      else requireGlobal(auth);
      return NextResponse.json({
        data: await rpc(auth.client, "admin_upsert_recipient", {
          p_id: input.id,
          p_display_name: input.displayName,
          p_is_active: input.isActive,
          p_is_development: input.isDevelopment,
        }),
      });
    }
    if (input.action === "historicalImport") {
      for (const id of new Set(input.rows.map((row) => row.careRecipientId)))
        await patientContext(auth, id, "manage", true);
      if (input.preview) {
        const report = [];
        const seen = new Set<number>();
        for (const [index, row] of input.rows.entries()) {
          let reason: string | null = seen.has(row.physicalProtocol)
            ? "Protocolo repetido no lote."
            : null;
          seen.add(row.physicalProtocol);
          const { data: patient, error: patientError } = await auth.client
            .from("care_recipients")
            .select("id")
            .eq("id", row.careRecipientId)
            .maybeSingle();
          if (patientError) databaseError(patientError);
          if (!patient) reason = "Paciente não identificado.";
          const { data: existing, error: existingError } = await auth.client
            .from("requisitions")
            .select("id")
            .eq(
              "protocol",
              `HC-${String(row.physicalProtocol).padStart(6, "0")}`,
            )
            .limit(1);
          if (existingError) databaseError(existingError);
          if (existing?.length) reason = "Protocolo já registrado.";
          const ids = row.lines.map((line) => line.productId);
          if (ids.length) {
            const { data: products, error: productError } = await auth.client
              .from("care_recipient_products")
              .select("product_id")
              .eq("care_recipient_id", row.careRecipientId)
              .in("product_id", ids);
            if (productError) databaseError(productError);
            if (
              new Set(ids).size !== ids.length ||
              (products ?? []).length !== ids.length
            )
              reason =
                "Produto repetido ou sem associação comprovada ao paciente.";
          }
          report.push({
            row: index + 1,
            physicalProtocol: row.physicalProtocol,
            status: reason ? "invalid" : "valid",
            reason,
            unknownStockItems: [...row.lines, ...row.extraItems].filter(
              (item) => item.currentStock == null,
            ).length,
            customItems: row.extraItems.length,
          });
        }
        return NextResponse.json({
          data: {
            preview: true,
            total: report.length,
            valid: report.filter((row) => row.status === "valid").length,
            report,
          },
        });
      }
      const sourceHash = createHash("sha256")
        .update(JSON.stringify(input.rows))
        .digest("hex");
      return NextResponse.json({
        data: await rpc(auth.client, "import_historical_requisitions", {
          p_source_hash: sourceHash,
          p_rows: input.rows,
        }),
      });
    }
    await patientContext(auth, input.careRecipientId, "manage", true);
    let data: unknown;
    switch (input.action) {
      case "product":
        data = await rpc(auth.client, "admin_upsert_recipient_product", {
          p_care_recipient_id: input.careRecipientId,
          p_product_id: input.id,
          p_name: input.name,
          p_category: input.category,
          p_unit: input.unit,
          p_aliases: input.aliases,
          p_is_active: input.isActive,
          p_description: input.description ?? null,
          p_sort_order: input.sortOrder,
        });
        break;
      case "adoptProduct":
        data = await rpc(auth.client, "admin_adopt_product", {
          p_care_recipient_id: input.careRecipientId,
          p_product_id: input.productId,
        });
        break;
      case "membership": {
        data = await rpc(auth.client, "admin_upsert_membership", {
          p_care_recipient_id: input.careRecipientId,
          p_user_id: input.userId,
          p_role: input.role,
          p_can_manage_stock: input.canManageStock,
          p_can_count_stock: input.canCountStock,
        });
        break;
      }
      case "membershipStatus":
        data = await rpc(auth.client, "admin_set_membership_status", {
          p_care_recipient_id: input.careRecipientId,
          p_user_id: input.userId,
          p_status: input.status,
        });
        break;
      case "alertRule":
        if (quantity(input.criticalThreshold).gt(input.lowThreshold))
          throw new ApiError(
            "VALIDATION_ERROR",
            "O limite crítico deve ser menor ou igual ao limite baixo.",
          );
        data = await rpc(auth.client, "configure_stock_alert", {
          p_care_recipient_id: input.careRecipientId,
          p_product_id: input.productId,
          p_location: input.location,
          p_low_threshold: input.lowThreshold,
          p_critical_threshold: input.criticalThreshold,
          p_is_enabled: input.isEnabled,
        });
        break;
      case "notificationRecipient":
        data = await rpc(auth.client, "configure_recipient_notification", {
          p_care_recipient_id: input.careRecipientId,
          p_recipient_user_id: input.recipientUserId,
          p_recipient_group: input.recipientGroup,
          p_channel: input.channel,
          p_destination: input.destination,
          p_enabled: input.isEnabled,
          p_include_team_alerts: input.includeTeamAlerts,
        });
        break;
      case "invitation":
      case "resendInvitation": {
        const token = randomBytes(32).toString("base64url");
        const hash = createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
        if (input.action === "resendInvitation") {
          const { data: invite, error } = await auth.client
            .from("care_recipient_invitations")
            .select("care_recipient_id")
            .eq("id", input.invitationId)
            .eq("care_recipient_id", input.careRecipientId)
            .maybeSingle();
          if (error) databaseError(error);
          if (!invite)
            throw new ApiError("NOT_FOUND", "Convite não encontrado.", 404);
          data = await rpc(auth.client, "admin_resend_invitation", {
            p_invitation_id: input.invitationId,
            p_token_hash: hash,
            p_expires_at: expiresAt,
          });
        } else if (input.action === "invitation")
          data = await rpc(auth.client, "admin_create_invitation", {
            p_care_recipient_id: input.careRecipientId,
            p_email: input.email.toLowerCase(),
            p_role: input.role,
            p_can_manage_stock: input.canManageStock,
            p_can_count_stock: input.canCountStock,
            p_token_hash: hash,
            p_expires_at: expiresAt,
          });
        // The secret is returned once and is never persisted or logged by the app.
        const invitationUrl = new URL("/convites/aceitar", appOrigin(request));
        invitationUrl.hash = `token=${token}`;
        const safe =
          data && typeof data === "object"
            ? Object.fromEntries(
                Object.entries(data).filter(([key]) => key !== "token_hash"),
              )
            : data;
        return NextResponse.json({
          data: safe,
          invitationUrl: invitationUrl.toString(),
          delivery: "manual",
        });
      }
      case "revokeInvitation": {
        const { data: invite, error } = await auth.client
          .from("care_recipient_invitations")
          .select("id")
          .eq("id", input.invitationId)
          .eq("care_recipient_id", input.careRecipientId)
          .maybeSingle();
        if (error) databaseError(error);
        if (!invite)
          throw new ApiError("NOT_FOUND", "Convite não encontrado.", 404);
        const revoked = await rpc(auth.client, "revoke_invitation", {
          p_invitation_id: input.invitationId,
        });
        data =
          revoked && typeof revoked === "object"
            ? Object.fromEntries(
                Object.entries(revoked).filter(([key]) => key !== "token_hash"),
              )
            : revoked;
        break;
      }
    }
    return NextResponse.json({ data });
  });
}
