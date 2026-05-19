import { makeCrud } from "@/lib/crud";
import { paymentTypes, insertPaymentTypeSchema } from "@shared/schema";

const crud = makeCrud({ table: paymentTypes, insertSchema: insertPaymentTypeSchema });
export const GET = crud.listAll;
export const POST = crud.createOne;
