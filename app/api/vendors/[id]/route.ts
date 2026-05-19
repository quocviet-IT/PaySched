import { makeCrud } from "@/lib/crud";
import { vendors, insertVendorSchema } from "@shared/schema";

const crud = makeCrud({
  table: vendors,
  insertSchema: insertVendorSchema,
  requireAdminToWrite: true,
});
export const PATCH = crud.updateOne;
export const PUT = crud.updateOne;
export const DELETE = crud.deleteOne;
