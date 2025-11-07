import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { CreateContactDialog } from "@/components/CreateContactDialog";

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery();

  const filteredContacts = contacts?.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.contact.name.toLowerCase().includes(query) ||
      item.contact.company?.toLowerCase().includes(query) ||
      item.contact.role?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your networking connections
          </p>
        </div>
        <CreateContactDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <CardDescription>
            {filteredContacts?.length || 0} contacts in your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading contacts...
            </div>
          ) : filteredContacts && filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No contacts found matching your search." : "No contacts yet. Start networking!"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts?.map((item) => (
                    <TableRow key={item.contact.id}>
                      <TableCell className="font-medium">
                        {item.contact.name}
                      </TableCell>
                      <TableCell>{item.contact.company || "-"}</TableCell>
                      <TableCell>{item.contact.role || "-"}</TableCell>
                      <TableCell>{item.event?.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(item.contact.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/contacts/${item.contact.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
