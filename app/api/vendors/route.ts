import { makeCrud } from "@/lib/crud";
import { vendors, insertVendorSchema } from "@shared/schema";

const crud = makeCrud({
  table: vendors,
  insertSchema: insertVendorSchema,
  requireAdminToWrite: true,
});
export const GET = crud.listAll;
export const POST = crud.createOne;
