"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createStaffAccount, updateProfileRole, updateStaffAssignments } from "@/lib/actions/admin";
import type { Post, Profile, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAntiDuplicate } from "@/hooks/use-anti-duplicate";

type StaffRow = Profile & { assigned_post_ids: string[] };

export function StaffManager({
  posts,
  people,
}: {
  posts: Post[];
  people: StaffRow[];
}) {
  const { isSubmitting, run } = useAntiDuplicate();
  const staff = people.filter((person) => person.role === "staff");
  const supervisors = people.filter((person) => person.role === "supervisor");
  const admins = people.filter((person) => person.role === "admin");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void run(async () => {
                const result = await createStaffAccount(new FormData(form));
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Account created.");
                  form.reset();
                }
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue="staff"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="staff">Counting staff</option>
                <option value="supervisor">Counting supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Assign posts (staff only)</Label>
              <div className="flex flex-wrap gap-3">
                {posts.map((post) => (
                  <label key={post.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="post_ids" value={post.id} />
                    {post.name}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>

      <RoleList title="Counting supervisor" people={supervisors} />
      <RoleList title="Admins" people={admins} />
      <StaffList staff={staff} posts={posts} />
    </div>
  );
}

function RoleList({ title, people }: { title: string; people: Profile[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">None assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {people.map((person) => (
              <li key={person.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="font-medium">{person.full_name}</span>
                <Badge variant="secondary" className="capitalize">
                  {person.role}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StaffList({ staff, posts }: { staff: StaffRow[]; posts: Post[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Counting staff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.length === 0 && <p className="text-sm text-muted-foreground">No staff accounts yet.</p>}
        {staff.map((person) => (
          <StaffRowCard key={person.id} person={person} posts={posts} />
        ))}
      </CardContent>
    </Card>
  );
}

function StaffRowCard({ person, posts }: { person: StaffRow; posts: Post[] }) {
  const [selected, setSelected] = useState<string[]>(person.assigned_post_ids);
  const { isSubmitting, run } = useAntiDuplicate();

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{person.full_name}</p>
        <select
          className="h-9 rounded-md border border-input bg-card px-2 text-sm"
          defaultValue={person.role}
          onChange={(event) => {
            void updateProfileRole(person.id, event.target.value as UserRole).then((result) => {
              if (result.error) toast.error(result.error);
              else toast.success("Role updated.");
            });
          }}
        >
          <option value="staff">staff</option>
          <option value="supervisor">supervisor</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        {posts.map((post) => (
          <label key={post.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(post.id)}
              onChange={(event) => {
                setSelected((current) =>
                  event.target.checked
                    ? [...current, post.id]
                    : current.filter((id) => id !== post.id),
                );
              }}
            />
            {post.name}
          </label>
        ))}
      </div>
      <Button
        className="mt-3"
        size="sm"
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          void run(async () => {
            const result = await updateStaffAssignments(person.id, selected);
            if (result.error) toast.error(result.error);
            else toast.success("Assignments saved.");
          });
        }}
      >
        {isSubmitting ? <Spinner /> : null}
        Save assignments
      </Button>
    </div>
  );
}
