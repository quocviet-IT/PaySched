import { makeCrud } from "@/lib/crud";
import { paymentTypes, insertPaymentTypeSchema } from "@shared/schema";

const crud = makeCrud({
  table: paymentTypes,
  insertSchema: insertPaymentTypeSchema,
  requireAdminToWrite: true,
});
export const PATCH = crud.updateOne;
export const PUT = crud.updateOne;
export const DELETE = crud.deleteOne;
