import { Prisma, AccountingAccountCode, AccountingEntryType, PaymentMethod } from '@prisma/client'

export async function logPurchaseReceiveAccountingEntry(
  tx: Prisma.TransactionClient,
  params: {
    storeId: string
    amount: number
    purchaseReceiveId?: string | null
    purchaseOrderId?: string | null
    purchaseId?: string | null
    narration?: string | null
    meta?: Prisma.JsonValue
  },
) {
  const { storeId, amount, purchaseReceiveId, purchaseOrderId, purchaseId, narration, meta } = params

  if (!amount || amount === 0) {
    return
  }

  await tx.accountingEntry.create({
    data: {
      storeId,
      type: AccountingEntryType.PURCHASE_RECEIVE,
      purchaseReceiveId: purchaseReceiveId ?? null,
      purchaseOrderId: purchaseOrderId ?? null,
      purchaseId: purchaseId ?? null,
      debitAccount: AccountingAccountCode.INVENTORY,
      creditAccount: AccountingAccountCode.GRNI,
      amount,
      narration: narration ?? null,
      meta: meta ?? undefined,
    },
  })
}

export async function logPurchaseBillAccountingEntry(
  tx: Prisma.TransactionClient,
  params: {
    storeId: string
    amount: number
    purchaseId: string
    purchaseOrderId?: string | null
    narration?: string | null
    meta?: Prisma.JsonValue
  },
) {
  const { storeId, amount, purchaseId, purchaseOrderId, narration, meta } = params

  if (!amount || amount === 0) {
    return
  }

  await tx.accountingEntry.create({
    data: {
      storeId,
      type: AccountingEntryType.PURCHASE_BILL,
      purchaseId,
      purchaseOrderId: purchaseOrderId ?? null,
      debitAccount: AccountingAccountCode.GRNI,
      creditAccount: AccountingAccountCode.ACCOUNTS_PAYABLE,
      amount,
      narration: narration ?? null,
      meta: meta ?? undefined,
    },
  })
}

function mapPaymentMethodToCreditAccount(method: PaymentMethod): AccountingAccountCode {
  if (method === PaymentMethod.CASH) {
    return AccountingAccountCode.CASH
  }

  if (
    method === PaymentMethod.CARD ||
    method === PaymentMethod.UPI ||
    method === PaymentMethod.BANK_TRANSFER ||
    method === PaymentMethod.CHEQUE ||
    method === PaymentMethod.WALLET
  ) {
    return AccountingAccountCode.BANK
  }

  return AccountingAccountCode.ACCOUNTS_PAYABLE
}

export async function logPurchasePaymentAccountingEntry(
  tx: Prisma.TransactionClient,
  params: {
    storeId: string
    amount: number
    purchaseId: string
    paymentId: string
    method: PaymentMethod
    narration?: string | null
    meta?: Prisma.JsonValue
  },
) {
  const { storeId, amount, purchaseId, paymentId, method, narration, meta } = params

  if (!amount || amount === 0) {
    return
  }

  const creditAccount = mapPaymentMethodToCreditAccount(method)

  if (creditAccount === AccountingAccountCode.ACCOUNTS_PAYABLE) {
    return
  }

  await tx.accountingEntry.create({
    data: {
      storeId,
      type: AccountingEntryType.PURCHASE_PAYMENT,
      purchaseId,
      paymentId,
      debitAccount: AccountingAccountCode.ACCOUNTS_PAYABLE,
      creditAccount,
      amount,
      narration: narration ?? null,
      meta: meta ?? undefined,
    },
  })
}
