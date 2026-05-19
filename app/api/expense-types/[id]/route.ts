import { makeCrud } from "@/lib/crud";
import { expenseTypes, insertExpenseTypeSchema } from "@shared/schema";

const crud = makeCrud({
  table: expenseTypes,
  insertSchema: insertExpenseTypeSchema,
  requireAdminToWrite: true,
});
export const PATCH = crud.updateOne;
export const DELETE = crud.deleteOne;
