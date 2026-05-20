"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";

export function AccountView() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const change = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/me/password", body),
    onSuccess: () => {
      toast({ title: "Password updated" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    },
    onError: (e: Error) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast({ title: "Password too short", description: "At least 4 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    change.mutate({ currentPassword, newPassword });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-md space-y-5">
          <div className="space-y-2">
            <Label htmlFor="acc-current">Current password</Label>
            <Input id="acc-current" type="password" required value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-new">New password</Label>
            <Input id="acc-new" type="password" required value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 4 characters" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-confirm">Confirm new password</Label>
            <Input id="acc-confirm" type="password" required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
