import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Calendar, Network } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: contacts, isLoading: contactsLoading } = trpc.contacts.list.useQuery(undefined, {
    staleTime: 30000, // Cache for 30 seconds
  });
  const { data: companies, isLoading: companiesLoading } = trpc.companies.list.useQuery(undefined, {
    staleTime: 30000,
  });
  const { data: events, isLoading: eventsLoading } = trpc.events.list.useQuery(undefined, {
    staleTime: 30000,
  });

  const isLoading = contactsLoading || companiesLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Contacts",
      value: contacts?.length || 0,
      icon: Users,
      description: "People in your network",
      link: "/contacts",
    },
    {
      title: "Companies",
      value: companies?.length || 0,
      icon: Building2,
      description: "Organizations tracked",
      link: "/contacts",
    },
    {
      title: "Events",
      value: events?.length || 0,
      icon: Calendar,
      description: "Networking events attended",
      link: "/contacts",
    },
    {
      title: "Network Graph",
      value: "View",
      icon: Network,
      description: "Visualize connections",
      link: "/graph",
    },
  ];

  const recentContacts = contacts?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your networking command center
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.link}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Contacts</CardTitle>
            <CardDescription>
              Your latest networking connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : recentContacts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No contacts yet. Start networking!
              </div>
            ) : (
              <div className="space-y-4">
                {recentContacts.map((item) => (
                  <Link key={item.contact.id} href={`/contacts/${item.contact.id}`}>
                    <div className="flex items-center justify-between hover:bg-accent/50 p-2 rounded-md transition-colors cursor-pointer">
                      <div>
                        <div className="font-medium">{item.contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.contact.role} {item.contact.company && `at ${item.contact.company}`}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.contact.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/contacts">
                  <Button variant="outline" className="w-full mt-4">
                    View All Contacts
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/contacts">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Browse All Contacts
              </Button>
            </Link>
            <Link href="/graph">
              <Button variant="outline" className="w-full justify-start">
                <Network className="mr-2 h-4 w-4" />
                View Knowledge Graph
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Calendar className="mr-2 h-4 w-4" />
              Add Event (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
