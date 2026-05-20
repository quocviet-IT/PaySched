"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import {
  ACCOUNT_TYPE_OPTIONS,
  type InternalCompany,
  type PaymentAccount,
  type AccountBank,
  type AccountMapping,
  type PaymentType,
  type ExpenseType,
  type Profile,
  type Vendor,
} from "@shared/schema";

export function SettingsTabs({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Tabs defaultValue="companies">
      <TabsList>
        <TabsTrigger value="companies">Internal Companies</TabsTrigger>
        <TabsTrigger value="vendors">Vendors</TabsTrigger>
        <TabsTrigger value="accounts">Payment Accounts</TabsTrigger>
        <TabsTrigger value="mappings">Account Mappings</TabsTrigger>
        <TabsTrigger value="payment-types">Payment Types</TabsTrigger>
        <TabsTrigger value="expense-types">Expense Types</TabsTrigger>
      </TabsList>

      <TabsContent value="companies"><CompaniesManager isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="vendors"><VendorsManager isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="accounts"><AccountsManager isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="mappings"><MappingsManager isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="payment-types"><PaymentTypesManager isAdmin={isAdmin} /></TabsContent>
      <TabsContent value="expense-types"><ExpenseTypesManager isAdmin={isAdmin} /></TabsContent>
    </Tabs>
  );
}

function useInvalidator(key: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [key] });
}

// ============ Internal Companies ============
function CompaniesManager({ isAdmin }: { isAdmin: boolean }) {
  const invalidate = useInvalidator("/api/internal-companies");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [abbreviation, setAbbreviation] = React.useState("");

  const { data = [], isLoading } = useQuery<InternalCompany[]>({
    queryKey: ["/api/internal-companies"],
  });

  const create = useMutation({
    mutationFn: (body: { name: string; abbreviation: string }) =>
      apiRequest("POST", "/api/internal-companies", body),
    onSuccess: () => {
      invalidate(); toast({ title: "Company added" });
      setOpen(false); setName(""); setAbbreviation("");
    },
    onError: (e: Error) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/internal-companies/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Company deleted" }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal Companies</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" />Add Company</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Internal Company</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-6"
              onSubmit={(e) => { e.preventDefault(); create.mutate({ name, abbreviation }); }}
            >
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Trans Fine Jewelry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-abbr">Abbreviation</Label>
                <Input id="company-abbr" required value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} placeholder="TFJ" />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Adding…" : "Add Company"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Abbreviation</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="font-mono uppercase tracking-eyebrow text-[11px] text-hp-muted">{c.abbreviation}</TableCell>
                  <TableCell>
                    {isAdmin && <RowDelete onClick={() => del.mutate(c.id)} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Vendors ============
function VendorsManager({ isAdmin }: { isAdmin: boolean }) {
  const invalidate = useInvalidator("/api/vendors");
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [abbreviation, setAbbreviation] = React.useState("");

  const { data = [], isLoading } = useQuery<Vendor[]>({ queryKey: ["/api/vendors"] });

  const reset = () => { setEditingId(null); setName(""); setAbbreviation(""); };

  const create = useMutation({
    mutationFn: (body: { name: string; abbreviation: string }) =>
      apiRequest("POST", "/api/vendors", body),
    onSuccess: () => {
      invalidate(); toast({ title: "Vendor added" });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; abbreviation: string } }) =>
      apiRequest("PATCH", `/api/vendors/${id}`, body),
    onSuccess: () => {
      invalidate(); toast({ title: "Vendor updated" });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vendors/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Vendor deleted" }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const startEdit = (v: Vendor) => {
    setEditingId(v.id);
    setName(v.name);
    setAbbreviation(v.abbreviation);
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name: name.trim(), abbreviation: abbreviation.trim().toUpperCase() };
    if (!body.name || !body.abbreviation) {
      toast({ title: "Please fill in name and abbreviation", variant: "destructive" });
      return;
    }
    if (editingId) update.mutate({ id: editingId, body });
    else create.mutate(body);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendors</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Vendor</DialogTitle></DialogHeader>
            <form className="space-y-6" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Vendor Name</Label>
                <Input id="vendor-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-abbr">Abbreviation</Label>
                <Input
                  id="vendor-abbr"
                  required
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                  placeholder="ACME"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {(create.isPending || update.isPending) ? "Saving…" : (editingId ? "Update Vendor" : "Add Vendor")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading /> : data.length === 0 ? (
          <Empty title="No vendors yet" body="Add a vendor to keep a reusable list of payees." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Abbreviation</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell className="font-mono uppercase tracking-eyebrow text-[11px] text-hp-muted">{v.abbreviation}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(v)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isAdmin && <RowDelete onClick={() => del.mutate(v.id)} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Payment Accounts ============
function AccountsManager({ isAdmin }: { isAdmin: boolean }) {
  const invAccounts = useInvalidator("/api/payment-accounts");
  const invBanks = useInvalidator("/api/account-banks");

  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [addBankOpen, setAddBankOpen] = React.useState(false);
  const [companyId, setCompanyId] = React.useState("");
  const [bankId, setBankId] = React.useState("");
  const [accountTypeCode, setAccountTypeCode] = React.useState("");
  const [lastFour, setLastFour] = React.useState("");
  const [newBankName, setNewBankName] = React.useState("");
  const [newBankNickname, setNewBankNickname] = React.useState("");

  const { data: accounts = [], isLoading } = useQuery<PaymentAccount[]>({ queryKey: ["/api/payment-accounts"] });
  const { data: companies = [] } = useQuery<InternalCompany[]>({ queryKey: ["/api/internal-companies"] });
  const { data: banks = [] } = useQuery<AccountBank[]>({ queryKey: ["/api/account-banks"] });

  const reset = () => { setCompanyId(""); setBankId(""); setAccountTypeCode(""); setLastFour(""); setEditingId(null); };

  const createAccount = useMutation({
    mutationFn: (body: { internalCompanyId: string; bankId: string; accountTypeCode: string; lastFourDigits: string | null }) =>
      apiRequest("POST", "/api/payment-accounts", body),
    onSuccess: () => { invAccounts(); toast({ title: "Account added" }); reset(); setOpen(false); },
    onError: (e: Error) => toast({ title: "Failed to add account", description: e.message, variant: "destructive" }),
  });

  const updateAccount = useMutation({
    mutationFn: (body: { id: string; patch: { internalCompanyId: string; bankId: string; accountTypeCode: string; lastFourDigits: string | null } }) =>
      apiRequest("PATCH", `/api/payment-accounts/${body.id}`, body.patch),
    onSuccess: () => { invAccounts(); toast({ title: "Account updated" }); reset(); setOpen(false); },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const createBank = useMutation({
    mutationFn: (body: { name: string; nickname: string }) =>
      apiRequest("POST", "/api/account-banks", body),
    onSuccess: () => { invBanks(); toast({ title: "Bank added" }); setAddBankOpen(false); setNewBankName(""); setNewBankNickname(""); },
    onError: (e: Error) => toast({ title: "Failed to add bank", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/payment-accounts/${id}`),
    onSuccess: () => { invAccounts(); toast({ title: "Account deleted" }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const company = companies.find((c) => c.id === companyId);
  const bank = banks.find((b) => b.id === bankId);
  const option = ACCOUNT_TYPE_OPTIONS.find((o) => o.code === accountTypeCode);
  const preview = [company?.abbreviation, bank?.nickname, option?.code, lastFour].filter(Boolean).join(" ");

  const submit = () => {
    if (!companyId || !bankId || !accountTypeCode) {
      toast({ title: "Select company, bank, and type", variant: "destructive" });
      return;
    }
    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      toast({ title: "Last 4 digits must be exactly 4 numbers", variant: "destructive" });
      return;
    }
    const patch = {
      internalCompanyId: companyId, bankId, accountTypeCode,
      lastFourDigits: lastFour || null,
    };
    if (editingId) {
      updateAccount.mutate({ id: editingId, patch });
    } else {
      createAccount.mutate(patch);
    }
  };

  const startEdit = (a: PaymentAccount) => {
    setEditingId(a.id);
    setCompanyId(a.internalCompanyId);
    setBankId(a.bankId);
    setAccountTypeCode(a.accountTypeCode);
    setLastFour(a.lastFourDigits ?? "");
    setOpen(true);
  };

  const isPending = createAccount.isPending || updateAccount.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Accounts</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" />Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Payment Account</DialogTitle></DialogHeader>
            <div className="space-y-6">
              <FieldSelect label="Internal Company" value={companyId} onChange={setCompanyId} placeholder="Select company">
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.abbreviation})</SelectItem>
                ))}
              </FieldSelect>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="account-bank">Bank</Label>
                  <Dialog open={addBankOpen} onOpenChange={setAddBankOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm"><Plus className="h-3 w-3" />Add bank</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Add Bank</DialogTitle></DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="new-bank-name">Bank Name</Label>
                          <Input id="new-bank-name" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Bank of America" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-bank-nickname">Nickname</Label>
                          <Input id="new-bank-nickname" value={newBankNickname} onChange={(e) => setNewBankNickname(e.target.value)} placeholder="BoA" />
                        </div>
                        <DialogFooter>
                          <Button variant="secondary" type="button" onClick={() => setAddBankOpen(false)}>Cancel</Button>
                          <Button
                            type="button"
                            disabled={createBank.isPending}
                            onClick={() => {
                              if (!newBankName.trim() || !newBankNickname.trim()) {
                                toast({ title: "Please fill in name and nickname", variant: "destructive" });
                                return;
                              }
                              createBank.mutate({ name: newBankName.trim(), nickname: newBankNickname.trim() });
                            }}
                          >
                            {createBank.isPending ? "Saving…" : "Save"}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger id="account-bank"><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.nickname})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <FieldSelect label="Account Type" value={accountTypeCode} onChange={setAccountTypeCode} placeholder="Select type">
                {ACCOUNT_TYPE_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.label} ({o.code})</SelectItem>)}
              </FieldSelect>

              <div className="space-y-2">
                <Label htmlFor="last-four">Last 4 Digits (optional)</Label>
                <Input
                  id="last-four"
                  value={lastFour}
                  inputMode="numeric"
                  onChange={(e) => setLastFour(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  placeholder="9876"
                />
              </div>

              <div className="space-y-2">
                <Label>Generated Name</Label>
                <Input value={preview || "Select company, bank, and type"} readOnly />
              </div>

              <DialogFooter>
                <Button variant="secondary" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
                <Button onClick={submit} disabled={isPending}>
                  {isPending ? "Saving…" : (editingId ? "Update Account" : "Add Account")}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last 4</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => {
                const c = companies.find((x) => x.id === a.internalCompanyId);
                const b = banks.find((x) => x.id === a.bankId);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-hp-ink">{a.name}</TableCell>
                    <TableCell>{c ? `${c.name} (${c.abbreviation})` : "—"}</TableCell>
                    <TableCell>{b ? `${b.name} (${b.nickname})` : "—"}</TableCell>
                    <TableCell className="uppercase tracking-eyebrow text-[11px] text-hp-muted">{a.accountType}</TableCell>
                    <TableCell className="font-mono tabular-nums">{a.lastFourDigits || "—"}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(a)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && <RowDelete onClick={() => del.mutate(a.id)} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Account Mappings ============
function MappingsManager({ isAdmin }: { isAdmin: boolean }) {
  const invalidate = useInvalidator("/api/account-mappings");
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [csvName, setCsvName] = React.useState("");
  const [accountId, setAccountId] = React.useState("");

  const { data: mappings = [], isLoading } = useQuery<AccountMapping[]>({ queryKey: ["/api/account-mappings"] });
  const { data: accounts = [] } = useQuery<PaymentAccount[]>({ queryKey: ["/api/payment-accounts"] });

  const reset = () => { setOpen(false); setEditingId(null); setCsvName(""); setAccountId(""); };

  const create = useMutation({
    mutationFn: (body: { csvAccountName: string; paymentAccountId: string }) =>
      apiRequest("POST", "/api/account-mappings", body),
    onSuccess: () => { invalidate(); toast({ title: "Mapping added" }); reset(); },
    onError: (e: Error) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { csvAccountName: string; paymentAccountId: string } }) =>
      apiRequest("PATCH", `/api/account-mappings/${id}`, body),
    onSuccess: () => { invalidate(); toast({ title: "Mapping updated" }); reset(); },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/account-mappings/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Mapping deleted" }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvName || !accountId) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (editingId) update.mutate({ id: editingId, body: { csvAccountName: csvName, paymentAccountId: accountId } });
    else create.mutate({ csvAccountName: csvName, paymentAccountId: accountId });
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Account Mappings</CardTitle>
          <p className="text-sm text-hp-muted">
            Map CSV bank account names to your payment accounts for automatic transaction matching.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" />Add Mapping</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Account Mapping</DialogTitle></DialogHeader>
            <form className="space-y-6" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="csv-name">CSV Account Name</Label>
                <Input id="csv-name" required value={csvName} onChange={(e) => setCsvName(e.target.value)} placeholder="Chase Checking x1234" />
                <p className="text-xs text-hp-muted">As it appears in your CSV export.</p>
              </div>
              <FieldSelect label="Payment Account" value={accountId} onChange={setAccountId} placeholder="Select payment account">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}{a.lastFourDigits ? ` (${a.lastFourDigits})` : ""}</SelectItem>
                ))}
              </FieldSelect>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editingId ? "Update" : "Add"} Mapping
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading /> : mappings.length === 0 ? (
          <Empty title="No account mappings yet" body="Add mappings to automatically match CSV transactions to your payment accounts." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CSV Account Name</TableHead>
                <TableHead>Mapped To</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => {
                const a = accounts.find((x) => x.id === m.paymentAccountId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.csvAccountName}</TableCell>
                    <TableCell>
                      {a ? (
                        <>
                          {a.name}
                          {a.lastFourDigits && <span className="ml-1 text-hp-muted">({a.lastFourDigits})</span>}
                        </>
                      ) : <span className="text-hp-muted">Unknown Account</span>}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => {
                          setEditingId(m.id); setCsvName(m.csvAccountName); setAccountId(m.paymentAccountId); setOpen(true);
                        }}
                        aria-label="Edit"
                      ><Pencil className="h-3.5 w-3.5" /></Button>
                      {isAdmin && <RowDelete onClick={() => del.mutate(m.id)} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Simple text-only managers (PaymentTypes, ExpenseTypes) ============
function SimpleNameManager({
  title, addLabel, endpoint, placeholder, isAdmin,
}: {
  title: string;
  addLabel: string;
  endpoint: string;
  placeholder: string;
  isAdmin: boolean;
}) {
  const invalidate = useInvalidator(endpoint);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const { data = [], isLoading } = useQuery<Array<{ id: string; name: string }>>({ queryKey: [endpoint] });

  const create = useMutation({
    mutationFn: (body: { name: string }) => apiRequest("POST", endpoint, body),
    onSuccess: () => { invalidate(); toast({ title: `${title.replace(/s$/, "")} added` }); setOpen(false); setName(""); },
    onError: (e: Error) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${endpoint}/${id}`),
    onSuccess: () => { invalidate(); toast({ title: `${title.replace(/s$/, "")} deleted` }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" />{addLabel}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{addLabel}</DialogTitle></DialogHeader>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); create.mutate({ name }); }}>
              <div className="space-y-2">
                <Label htmlFor="simple-name">Name</Label>
                <Input id="simple-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>{create.isPending ? "Adding…" : addLabel}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{title.replace(/s$/, "")}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{isAdmin && <RowDelete onClick={() => del.mutate(row.id)} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentTypesManager({ isAdmin }: { isAdmin: boolean }) {
  return (
    <SimpleNameManager
      title="Payment Types"
      addLabel="Add Type"
      endpoint="/api/payment-types"
      placeholder="ACH, Wire, Credit Card"
      isAdmin={isAdmin}
    />
  );
}

function ExpenseTypesManager({ isAdmin }: { isAdmin: boolean }) {
  return (
    <SimpleNameManager
      title="Expense Types"
      addLabel="Add Type"
      endpoint="/api/expense-types"
      placeholder="Insurance, Rent, Subscriptions"
      isAdmin={isAdmin}
    />
  );
}

// ============ Shared helpers ============
function Loading() {
  return <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-10 text-center">
      <p className="font-title text-lg text-hp-ink">{title}</p>
      <p className="mt-2 text-sm text-hp-muted">{body}</p>
    </div>
  );
}

function RowDelete({ onClick }: { onClick: () => void }) {
  return (
    <Button size="icon" variant="ghost" onClick={onClick} aria-label="Delete">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function FieldSelect({
  label, value, onChange, placeholder, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
