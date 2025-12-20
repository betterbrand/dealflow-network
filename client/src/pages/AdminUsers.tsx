import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, UserPlus, Shield } from "lucide-react";

export default function AdminUsers() {
  const [newEmail, setNewEmail] = useState("");
  const utils = trpc.useUtils();

  const { data: users, isLoading, error } = trpc.admin.listUsers.useQuery();
  
  const addUserMutation = trpc.admin.addUser.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setNewEmail("");
        utils.admin.listUsers.invalidate();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
      toast.error(errorMessage);
    },
  });

  const removeUserMutation = trpc.admin.removeUser.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        utils.admin.listUsers.invalidate();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
      toast.error(errorMessage);
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    addUserMutation.mutate({ email: newEmail });
  };

  const handleRemoveUser = (email: string) => {
    if (confirm(`Are you sure you want to remove ${email} from the authorized users list?`)) {
      removeUserMutation.mutate({ email });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access this page. Admin access is required.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage authorized users who can access the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>
            Add a new email address to the authorized users whitelist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? "Adding..." : "Add User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorized Users</CardTitle>
          <CardDescription>
            {users?.length || 0} users currently have access to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((email) => (
                  <TableRow key={email}>
                    <TableCell className="font-medium">{email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(email)}
                        disabled={removeUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No authorized users found
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Changes to the whitelist are temporary and will be reset when the server restarts</p>
          <p>• For permanent changes, update the AUTHORIZED_USERS array in server/_core/magic-link.ts</p>
          <p>• You cannot remove yourself from the authorized users list</p>
          <p>• At least one user must remain in the whitelist at all times</p>
        </CardContent>
      </Card>
    </div>
  );
}
