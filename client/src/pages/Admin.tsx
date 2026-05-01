import { useState } from "react";
import {
  useGetData,
  usePostData,
  usePatchData,
  useDeleteData,
} from "@/lib/api-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input as BaseInput } from "@/components/ui/input";
import { toast } from "sonner";
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  Clock,
  Users,
  Search,
  MoreHorizontal,
  Edit2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "STAFF";
  is_active: boolean;
  created_at: string;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: "OWNER" | "STAFF";
  created_at: string;
  expires_at: string;
};

export default function AdminPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"OWNER" | "STAFF">("STAFF");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cancelInviteConfirm, setCancelInviteConfirm] = useState<string | null>(
    null,
  );

  const { data, refetch } = useGetData<{ items: AdminUser[] }>("/admin");
  const { data: invitesData, refetch: refetchInvites } = useGetData<{
    items: PendingInvitation[];
  }>("/admin/invites");

  const users = data?.items ?? [];
  const pendingInvites = invitesData?.items ?? [];

  const { mutate: invite, isPending: inviting } = usePostData("/admin/invite");
  const { mutate: update } = usePatchData("/admin");
  const { mutate: cancelInvite } = useDeleteData("/admin/invites");

  const handleInvite = () => {
    if (!email) return;
    invite(
      { email, name, role },
      {
        onSuccess: () => {
          toast.success(`${email} has been invited`);
          setInviteOpen(false);
          setEmail("");
          setName("");
          setRole("STAFF");
          refetch();
          refetchInvites();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDeleteUser = (userId: string) => {
    update(
      { id: userId, is_active: false },
      {
        onSuccess: () => {
          toast.success("Admin removed");
          refetch();
          setDeleteConfirm(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleCancelInvite = (inviteId: string) => {
    cancelInvite(
      { id: inviteId },
      {
        onSuccess: () => {
          toast.success("Invitation cancelled");
          refetchInvites();
          setCancelInviteConfirm(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const changeRole = (user: AdminUser, newRole: "OWNER" | "STAFF") => {
    update(
      { id: user.id, role: newRole },
      {
        onSuccess: () => {
          toast.success("Role updated successfully");
          refetch();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setName(user.name || "");
    setRole(user.role);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    update(
      { id: editingUser.id, name, role },
      {
        onSuccess: () => {
          toast.success("Admin updated successfully");
          setEditOpen(false);
          setEditingUser(null);
          setName("");
          refetch();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const activeUsers = users.filter((u) => u.is_active);
  const filteredUsers = activeUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredInvites = pendingInvites.filter((invite) =>
    invite.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="border-b border-border bg-gradient-to-b from-background via-background to-muted/40 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg hover-elevate">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Team Management
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage admins and invitations for your zPOS system
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingUser(null);
                setName("");
                setEmail("");
                setRole("STAFF");
                setInviteOpen(true);
              }}
              className="gap-2 hover-elevate"
            >
              <UserPlus className="w-4 h-4" />
              Invite Admin
            </Button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="px-6 py-8">
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="bg-muted border border-border">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Active Admins ({activeUsers.length})
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Mail className="w-4 h-4 mr-2" />
                Pending ({pendingInvites.length})
              </TabsTrigger>
            </TabsList>

            {/* Active Admins Tab */}
            <TabsContent value="active" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <BaseInput
                  placeholder="Search admins by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Card className="overflow-hidden border border-border shadow-sm hover-elevate">
                {filteredUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Admin
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-muted/30 transition-colors hover-elevate"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-semibold">
                                  {user.name?.[0]?.toUpperCase() ??
                                    user.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {user.name || "Unnamed"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  user.role === "OWNER"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-chart-1" />
                                <span className="text-sm font-medium text-chart-1">
                                  Active
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 hover-elevate"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit admin"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover-elevate"
                                  onClick={() => setDeleteConfirm(user.id)}
                                  title="Remove admin"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-muted/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No admins found matching your search."
                        : "No active admins yet. Invite someone to get started."}
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Pending Invitations Tab */}
            <TabsContent value="pending" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <BaseInput
                  placeholder="Search invitations by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Card className="overflow-hidden border border-border shadow-sm hover-elevate">
                {filteredInvites.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Invited
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-foreground uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredInvites.map((invite) => (
                          <tr
                            key={invite.id}
                            className="hover:bg-muted/30 transition-colors hover-elevate"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-foreground">
                                {invite.email}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary">{invite.role}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-muted-foreground">
                                {new Date(
                                  invite.created_at,
                                ).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-chart-3" />
                                <span className="text-sm font-medium text-chart-3">
                                  Pending
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover-elevate"
                                  onClick={() =>
                                    setCancelInviteConfirm(invite.id)
                                  }
                                  title="Cancel invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Mail className="w-12 h-12 text-muted/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No invitations found matching your search."
                        : "No pending invitations."}
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              Invite New Admin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <Input
                placeholder="John Doe (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={inviting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Role
              </label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "OWNER" | "STAFF")}
                disabled={inviting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">
                    <div className="text-sm">
                      <p className="font-medium">Owner</p>
                      <p className="text-xs text-muted-foreground">
                        Full access including team management
                      </p>
                    </div>
                  </SelectItem>
                  <SelectItem value="STAFF">
                    <div className="text-sm">
                      <p className="font-medium">Staff</p>
                      <p className="text-xs text-muted-foreground">
                        POS access and reports only
                      </p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!email || inviting}>
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Edit2 className="w-5 h-5 text-primary" />
              </div>
              Edit Admin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Role
              </label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "OWNER" | "STAFF")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
          <AlertDialogDescription>
            This admin will no longer have access to your zPOS system. This
            action can be undone by re-inviting them.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  handleDeleteUser(deleteConfirm);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation Dialog */}
      <AlertDialog
        open={!!cancelInviteConfirm}
        onOpenChange={() => setCancelInviteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            This invitation will be cancelled. The email recipient won&apos;t be
            able to access your zPOS system unless invited again.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelInviteConfirm) {
                  handleCancelInvite(cancelInviteConfirm);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Invitation
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
