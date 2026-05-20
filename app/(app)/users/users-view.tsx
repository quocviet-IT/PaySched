"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
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
import type { Profile } from "@shared/schema";

export function UsersView() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/users"] });

  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"Admin" | "User">("User");

  const { data: users = [], isLoading } = useQuery<Profile[]>({ queryKey: ["/api/users"] });

  const create = useMutation({
    mutationFn: (body: { username: string; password: string; role: "Admin" | "User" }) =>
      apiRequest("POST", "/api/users", body),
    onSuccess: () => {
      invalidate(); toast({ title: "User created" });
      setOpen(false); setUsername(""); setPassword(""); setRole("User");
    },
    onError: (e: Error) => toast({ title: "Failed to create", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "User deleted" }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" />Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); create.mutate({ username, password, role }); }}>
              <div className="space-y-2">
                <Label htmlFor="user-username">Username</Label>
                <Input id="user-username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password</Label>
                <Input id="user-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
              </div>
              <RoleSelect value={role} onChange={setRole} />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create User"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="uppercase tracking-eyebrow text-[11px] text-hp-muted">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-body text-hp-ink">{u.username}</TableCell>
                  <TableCell>
                    <span className={`uppercase tracking-eyebrow text-[11px] ${u.role === "Admin" ? "text-hp-pink" : "text-hp-muted"}`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-hp-muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <EditUserButton user={u} onSaved={invalidate} />
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(u.id)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

function EditUserButton({ user, onSaved }: { user: Profile; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"Admin" | "User">(user.role as "Admin" | "User");

  React.useEffect(() => {
    if (open) {
      setPassword("");
      setRole(user.role as "Admin" | "User");
    }
  }, [open, user.role]);

  const save = useMutation({
    mutationFn: (body: { password?: string; role?: "Admin" | "User" }) =>
      apiRequest("PATCH", `/api/users/${user.id}`, body),
    onSuccess: () => {
      onSaved();
      toast({ title: "User updated" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: { password?: string; role?: "Admin" | "User" } = {};
    if (password.trim()) body.password = password;
    if (role !== user.role) body.role = role;
    if (Object.keys(body).length === 0) {
      toast({ title: "Nothing to change" });
      return;
    }
    save.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Edit user">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {user.username}</DialogTitle></DialogHeader>
        <form className="space-y-6" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="edit-user-password">New password (leave blank to keep current)</Label>
            <Input id="edit-user-password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters" />
          </div>
          <RoleSelect value={role} onChange={setRole} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleSelect({ value, onChange }: { value: "Admin" | "User"; onChange: (v: "Admin" | "User") => void }) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Role</Label>
      <Select value={value} onValueChange={(v) => onChange(v as "Admin" | "User")}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="User">User</SelectItem>
          <SelectItem value="Admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
