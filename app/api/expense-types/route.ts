import { makeCrud } from "@/lib/crud";
import { expenseTypes, insertExpenseTypeSchema } from "@shared/schema";

const crud = makeCrud({ table: expenseTypes, insertSchema: insertExpenseTypeSchema });
export const GET = crud.listAll;
export const POST = crud.createOne;
